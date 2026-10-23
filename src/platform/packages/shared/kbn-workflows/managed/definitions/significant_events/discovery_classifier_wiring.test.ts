/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface WorkflowStep {
  name: string;
  type?: string;
  condition?: string;
  'on-failure'?: { continue?: boolean };
  'iteration-on-failure'?: { continue?: boolean };
  foreach?: string;
  steps?: WorkflowStep[];
  with?: Record<string, unknown>;
}

interface InputProperty {
  type?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
}

interface ParsedWorkflow {
  steps: WorkflowStep[];
  outputs?: Array<{ name: string; type: string }>;
  triggers: Array<{
    inputs?: { properties?: Record<string, InputProperty>; additionalProperties?: boolean };
  }>;
}

const discovery = parse(SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW.yaml) as ParsedWorkflow;

const flattenSteps = (steps: WorkflowStep[]): WorkflowStep[] =>
  steps.flatMap((step) => [step, ...(step.steps ? flattenSteps(step.steps) : [])]);

const requireStep = (name: string): WorkflowStep => {
  const step = flattenSteps(discovery.steps).find((candidate) => candidate.name === name);
  if (!step) throw new Error(`Expected workflow step ${name}`);
  return step;
};

const topLevelIndex = (name: string): number =>
  discovery.steps.findIndex((step) => step.name === name);

const evaluate = (expression: unknown, context: Record<string, unknown>): unknown => {
  if (typeof expression !== 'string') throw new Error('Expected an expression string');
  return createWorkflowLiquidEngine().evalValueSync(expression.slice(3, -2).trim(), context);
};

const rawRows = [
  ['rule-A', { detection_id: 'detection-A' }],
  ['rule-B', { detection_id: 'detection-B' }],
];
const baseContext = {
  steps: {
    get_detections: { output: { columns: [{ name: 'rule_uuid' }], values: rawRows } },
    count_detections: { output: { detectionCount: rawRows.length } },
  },
};
const withClassify = (classify: unknown) => ({
  steps: { ...baseContext.steps, classify_detections: classify },
});

describe('discovery workflow detection classifier wiring', () => {
  describe('placement', () => {
    it('classifies after fetching detections and before the batch is sized and gated', () => {
      const order = [
        'get_detections',
        'count_detections',
        'classify_detections',
        'compute_batch_size',
        'compute_has_work',
        'maybe_exit_no_work',
        'run_discovery_agent',
      ].map(topLevelIndex);

      expect(order.every((index) => index >= 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    });

    it('uses the registered step type and never lets a classifier failure fail the run', () => {
      const step = requireStep('classify_detections');

      expect(step.type).toBe('significantEvents.classifyDetections');
      expect(step['on-failure']).toEqual({ continue: true });
    });

    it('passes the detection rows, the space and every classifier input to the step', () => {
      const withBlock = requireStep('classify_detections').with ?? {};

      expect(withBlock).toEqual({
        rows: '${{ steps.get_detections.output.values }}',
        columns: "${{ steps.get_detections.output.columns | map: 'name' }}",
        space_id: '{{ variables.spaceId }}',
        probe_window_minutes: '${{ inputs.classifierProbeWindowMinutes }}',
        probe_timeout_ms: '${{ inputs.classifierProbeTimeoutMs }}',
        probe_concurrency: '${{ inputs.classifierProbeConcurrency }}',
        budget_ms: '${{ inputs.classifierBudgetMs }}',
        max_skip_age_hours: '${{ inputs.classifierMaxSkipAgeHours }}',
      });
    });
  });

  describe('when the detections query returned nothing or failed (on-failure: continue)', () => {
    const rowsExpression = () => requireStep('classify_detections').with?.rows;

    it('passes an empty result through as an empty list', () => {
      const emptyResult = { steps: { get_detections: { output: { values: [] } } } };

      expect(evaluate(rowsExpression(), emptyResult)).toEqual([]);
    });

    it.each([
      ['has no output', { steps: { get_detections: { output: {} } } }],
      ['failed', { steps: { get_detections: { error: { message: 'boom' } } } }],
    ])(
      'leaves rows undefined when the query %s, which the step reads as an empty batch',
      (_n, ctx) => {
        expect(evaluate(rowsExpression(), ctx)).toBeUndefined();
      }
    );

    it('counts zero raw detections, so the run ends as having no work', () => {
      const failed = { steps: { get_detections: { error: { message: 'boom' } } } };

      expect(evaluate(requireStep('count_detections').with?.detectionCount, failed)).toBe(0);
      expect(
        evaluate(requireStep('compute_batch_size').with?.processedCount, {
          steps: { count_detections: { output: { detectionCount: 0 } } },
        })
      ).toBe(0);
    });
  });

  describe('inputs', () => {
    const inputs = discovery.triggers[0].inputs;

    it.each([
      ['classifierProbeWindowMinutes', 'number', 20, 15, 360],
      ['classifierProbeTimeoutMs', 'number', 8000, 1000, 30000],
      ['classifierProbeConcurrency', 'number', 5, 1, 10],
      ['classifierBudgetMs', 'number', 20000, 2000, 60000],
    ])('declares %s with its default and bounds', (name, type, def, minimum, maximum) => {
      const property = inputs?.properties?.[name];

      expect(property).toMatchObject({ type, default: def });
      expect(property?.minimum).toBe(minimum);
      expect(property?.maximum).toBe(maximum);
    });
  });

  describe('the batch size that gates the run', () => {
    const expression = () => requireStep('compute_batch_size').with?.processedCount;

    it('keeps a classified count of zero, so an all-skipped batch ends the run', () => {
      expect(evaluate(expression(), withClassify({ output: { row_count: 0 } }))).toBe(0);
    });

    it.each([
      ['has failed', { error: { message: 'boom' } }],
      ['produced no output', undefined],
    ])('falls back to the raw detection count when the classifier %s', (_name, classify) => {
      expect(evaluate(expression(), withClassify(classify))).toBe(rawRows.length);
    });
  });

  describe('the detections the agent receives', () => {
    const renderMessage = (classify: unknown) => {
      const message = requireStep('run_discovery_agent').with?.message;
      if (typeof message !== 'string') throw new Error('Expected the agent message template');
      return createWorkflowLiquidEngine().parseAndRenderSync(message, withClassify(classify));
    };
    const batch = [{ detection_id: 'detection-B', rule_uuid: 'rule-B', flaky_probe: false }];

    it('lists the classified detections by field name when the classifier succeeded', () => {
      const rendered = renderMessage({ output: { batch } });

      expect(rendered).toContain(JSON.stringify(batch));
      expect(rendered).not.toContain('Columns:');
      expect(rendered).not.toContain('Rows:');
    });

    it('lists no detections, not the raw ones, when every detection was classified as a skip', () => {
      const rendered = renderMessage({ output: { batch: [] } });

      expect(rendered).toContain('## Detection batch\n\n[]');
      expect(rendered).not.toContain('detection-A');
    });

    it.each([
      ['has failed', { error: { message: 'boom' } }],
      ['produced no output', undefined],
    ])(
      'falls back to the raw rows, with their columns, when the classifier %s',
      (_name, classify) => {
        const rendered = renderMessage(classify);

        expect(rendered).toContain(`Rows: ${JSON.stringify(rawRows)}`);
        expect(rendered).toContain('Columns: ["rule_uuid"]');
      }
    );
  });

  describe('stamping skipped detections', () => {
    const gate = () => requireStep('stamp_skipped_detections').condition;
    const context = (classify: unknown) => ({ steps: { classify_detections: classify } });

    it('runs right after classification and before the run can exit for lack of work', () => {
      const order = [
        'classify_detections',
        'stamp_skipped_detections',
        'compute_batch_size',
        'maybe_exit_no_work',
        'run_discovery_agent',
      ].map(topLevelIndex);

      expect(order.every((index) => index >= 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    });

    it('stamps only when the classifier skipped at least one rule', () => {
      expect(evaluate(gate(), context({ output: { skipped_count: 1 } }))).toBe(true);
      expect(evaluate(gate(), context({ output: { skipped_count: 0 } }))).toBe(false);
    });

    it('never stamps when the classifier failed or produced no output', () => {
      expect(evaluate(gate(), context({ error: { message: 'boom' } }))).toBe(false);
      expect(evaluate(gate(), context(undefined))).toBe(false);
    });

    it('writes processed markers through the same internal route as the agent path, plus why', () => {
      const { body: skippedBody, ...skipped } = requireStep('write_skipped_marker').with ?? {};
      const { body: writtenBody, ...written } = requireStep('write_processed_marker').with ?? {};
      const { skip, detection_ids: ids, ...markerBody } = skippedBody as Record<string, unknown>;
      const { detection_ids: _writtenIds, ...writtenRest } = writtenBody as Record<string, unknown>;

      expect(skipped).toEqual(written);
      expect(markerBody).toEqual(writtenRest);
      expect(typeof skip).toBe('string');
      expect(typeof ids).toBe('string');
    });

    it('stamps one rule per request, whether its detections come back as a scalar or a list', () => {
      const prepare = requireStep('prepare_skipped_marker').with ?? {};
      const ids = (requireStep('write_skipped_marker').with?.body as Record<string, unknown>)
        .detection_ids;

      expect(
        evaluate(prepare.detection_ids, { foreach: { item: ['detection-A', 'rule-A'] } })
      ).toEqual(['detection-A']);
      expect(
        evaluate(prepare.detection_ids, {
          foreach: { item: [['detection-A', 'detection-B'], 'rule-A'] },
        })
      ).toEqual(['detection-A', 'detection-B']);
      expect(evaluate(ids, { foreach: { item: ['detection-A', 'detection-B'] } })).toEqual([
        'detection-A',
        'detection-B',
      ]);
    });

    it('stamps each rule only up to the detection the classifier judged', () => {
      const step = requireStep('get_skipped_rules_backlog').with ?? {};

      expect(step.query).toContain('LOCATE(?1, CONCAT(",", detection_id, ",")) > 0');
      expect(step.query).toContain('classified_at = MAX(@timestamp) WHERE classified BY rule_uuid');
      expect(step.query).toContain('@timestamp <= classified_at');
      expect(JSON.stringify(step.params)).toContain(
        'steps.classify_detections.output.skipped_detection_ids'
      );
    });

    describe('the reason stored on a skipped marker', () => {
      const skipExpression = () =>
        (requireStep('write_skipped_marker').with?.body as Record<string, unknown>).skip;
      const skips = [
        {
          rule_uuid: 'rule-B',
          skip: {
            reason: 'still_breaching',
            probe_status: 'ok',
            baseline: { decision: 'background', value: 150, samples: 60 },
          },
        },
      ];
      const forItem = (item: unknown[]) => ({
        steps: { classify_detections: { output: { skips } } },
        foreach: { item },
      });

      it("is the classifier's skip for the detection's rule, and nothing else of its decision", () => {
        expect(evaluate(skipExpression(), forItem(['detection-B', 'rule-B']))).toEqual(
          skips[0].skip
        );
      });

      it('is absent when the classifier has no skip for the rule', () => {
        expect(
          evaluate(skipExpression(), {
            ...forItem(['detection-C']),
            steps: {
              ...forItem(['detection-C']).steps,
              prepare_skipped_marker: { output: { rule_uuid: 'rule-C' } },
            },
          })
        ).toBeUndefined();
      });
    });

    it('lets a stamping failure pass without failing the run', () => {
      expect(requireStep('get_skipped_rules_backlog')['on-failure']).toEqual({ continue: true });
      expect(requireStep('foreach_stamp_skipped')['iteration-on-failure']).toEqual({
        continue: true,
      });
      expect(requireStep('write_skipped_marker')['on-failure']).toEqual({ continue: true });
    });
  });

  describe('outputs', () => {
    const classifierOutputs = [
      ['skippedCount', 'number'],
      ['needsAgentCount', 'number'],
      ['classifierReasonCounts', 'string'],
      ['classifierProbeStatusCounts', 'string'],
      ['classifierFailed', 'boolean'],
    ] as const;

    it.each(classifierOutputs)('declares the %s output as %s', (name, type) => {
      expect(discovery.outputs).toContainEqual({ name, type });
    });

    it.each(['output_budget_denied', 'output_no_detections', 'output_result'])(
      'sets every classifier output in %s',
      (stepName) => {
        const outputs = requireStep(stepName).with ?? {};

        for (const [name] of classifierOutputs) {
          expect(outputs).toHaveProperty(name);
        }
      }
    );

    it.each(['output_no_detections', 'output_result'])(
      'reports in %s whether the classifier failed',
      (stepName) => {
        const { classifierFailed } = requireStep(stepName).with ?? {};

        expect(evaluate(classifierFailed, withClassify({ error: { message: 'boom' } }))).toBe(true);
        expect(evaluate(classifierFailed, withClassify({ output: { row_count: 0 } }))).toBe(false);
      }
    );

    it('reports zeros and empty counts when the classifier produced nothing', () => {
      const outputs = requireStep('output_result').with ?? {};
      const context = withClassify(undefined);

      expect(evaluate(outputs.skippedCount, context)).toBe(0);
      expect(evaluate(outputs.needsAgentCount, context)).toBe(0);
      expect(evaluate(outputs.classifierReasonCounts, context)).toBe('{}');
      expect(evaluate(outputs.classifierProbeStatusCounts, context)).toBe('{}');
    });

    it('reports the classifier counts', () => {
      const outputs = requireStep('output_no_detections').with ?? {};
      const context = {
        ...withClassify({
          output: {
            skipped_count: 2,
            needs_agent_count: 1,
            reason_counts: { still_breaching: 2, possible_recovery: 1 },
            probe_status_counts: { ok: 3 },
          },
        }),
      };

      expect(evaluate(outputs.skippedCount, context)).toBe(2);
      expect(evaluate(outputs.needsAgentCount, context)).toBe(1);
      expect(JSON.parse(String(evaluate(outputs.classifierReasonCounts, context)))).toEqual({
        still_breaching: 2,
        possible_recovery: 1,
      });
      expect(JSON.parse(String(evaluate(outputs.classifierProbeStatusCounts, context)))).toEqual({
        ok: 3,
      });
    });
  });
});
