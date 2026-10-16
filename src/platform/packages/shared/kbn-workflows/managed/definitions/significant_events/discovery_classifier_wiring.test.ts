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
  if?: string;
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
        space_id: '{{ variables.spaceId }}',
        shadow_mode: '${{ inputs.classifierShadowMode }}',
        probe_window_minutes: '${{ inputs.classifierProbeWindowMinutes }}',
        probe_timeout_ms: '${{ inputs.classifierProbeTimeoutMs }}',
        probe_concurrency: '${{ inputs.classifierProbeConcurrency }}',
        budget_ms: '${{ inputs.classifierBudgetMs }}',
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
      ['classifierShadowMode', 'boolean', true, undefined, undefined],
      ['prefetchGroundingContext', 'boolean', false, undefined, undefined],
      ['prefetchGroundingResults', 'boolean', false, undefined, undefined],
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

    it('keeps rejecting undeclared inputs', () => {
      expect(inputs?.additionalProperties).toBe(false);
    });

    it('ships in shadow mode, so the agent still receives every detection', () => {
      expect(inputs?.properties?.classifierShadowMode?.default).toBe(true);
    });
  });

  describe('the batch size that gates the run', () => {
    const expression = () => requireStep('compute_batch_size').with?.processedCount;

    it('uses the classified row count', () => {
      expect(evaluate(expression(), withClassify({ output: { row_count: 1 } }))).toBe(1);
    });

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

  describe('the rows the agent receives', () => {
    const renderMessage = (classify: unknown) => {
      const message = requireStep('run_discovery_agent').with?.message;
      if (typeof message !== 'string') throw new Error('Expected the agent message template');
      return createWorkflowLiquidEngine().parseAndRenderSync(message, withClassify(classify));
    };

    it('lists only the classified rows when the classifier succeeded', () => {
      const classified = [rawRows[1]];

      expect(renderMessage({ output: { rows: classified } })).toContain(
        `Rows: ${JSON.stringify(classified)}`
      );
    });

    it('lists no rows, not the raw ones, when every detection was classified as a skip', () => {
      const rendered = renderMessage({ output: { rows: [] } });

      expect(rendered).toContain('Rows: []');
      expect(rendered).not.toContain('detection-A');
    });

    it.each([
      ['has failed', { error: { message: 'boom' } }],
      ['produced no output', undefined],
    ])('falls back to the raw detection rows when the classifier %s', (_name, classify) => {
      expect(renderMessage(classify)).toContain(`Rows: ${JSON.stringify(rawRows)}`);
    });

    it('keeps the columns from the detections query', () => {
      expect(renderMessage({ output: { rows: [] } })).toContain('Columns: ["rule_uuid"]');
    });
  });

  describe('prefetching the grounding context', () => {
    const step = () => requireStep('get_discovery_context');
    const context = (inputs: Record<string, unknown>, classify: unknown) => ({
      inputs,
      steps: { classify_detections: classify },
    });
    const renderMessage = (contextStep: unknown) => {
      const message = requireStep('run_discovery_agent').with?.message;
      if (typeof message !== 'string') throw new Error('Expected the agent message template');
      return createWorkflowLiquidEngine().parseAndRenderSync(message, {
        ...withClassify({ output: { rows: rawRows } }),
        steps: {
          ...withClassify({ output: { rows: rawRows } }).steps,
          get_discovery_context: contextStep,
        },
      });
    };

    it('runs after classification and before the agent', () => {
      expect(topLevelIndex('get_discovery_context')).toBeGreaterThan(
        topLevelIndex('classify_detections')
      );
      expect(topLevelIndex('get_discovery_context')).toBeLessThan(
        topLevelIndex('run_discovery_agent')
      );
    });

    it.each([
      ['is off', { prefetchGroundingContext: false }, 2, false],
      ['is on and the agent has rows', { prefetchGroundingContext: true }, 2, true],
      ['is on but every detection was skipped', { prefetchGroundingContext: true }, 0, false],
      [
        'is on but the grounding results are fetched instead',
        { prefetchGroundingContext: true, prefetchGroundingResults: true },
        2,
        false,
      ],
    ])('runs only when the input %s', (_name, inputs, rowCount, expected) => {
      expect(evaluate(step().if, context(inputs, { output: { row_count: rowCount } }))).toBe(
        expected
      );
    });

    it('asks for the rules and sources of the rows the agent receives', () => {
      const classify = { output: { rule_uuids: ['rule-A'], source_ids: ['source-1'] } };
      const { body } = step().with as { body: Record<string, unknown> };

      expect(evaluate(body.rule_uuids, context({}, classify))).toEqual(['rule-A']);
      expect(evaluate(body.source_ids, context({}, classify))).toEqual(['source-1']);
    });

    it('never fails the run', () => {
      expect(step()['on-failure']).toEqual({ continue: true });
    });

    describe('with the grounding results', () => {
      const groundingStep = () => requireStep('get_discovery_grounding');

      it.each([
        ['is off', { prefetchGroundingResults: false }, 2, false],
        ['is on and the agent has rows', { prefetchGroundingResults: true }, 2, true],
        ['is on but every detection was skipped', { prefetchGroundingResults: true }, 0, false],
      ])('runs only when its input %s', (_name, inputs, rowCount, expected) => {
        expect(
          evaluate(groundingStep().if, context(inputs, { output: { row_count: rowCount } }))
        ).toBe(expected);
      });

      it('sends the detection times with the rules and sources, and never fails the run', () => {
        const { body } = groundingStep().with as { body: Record<string, unknown> };
        const classify = {
          output: {
            rule_uuids: ['rule-A'],
            source_ids: ['source-1'],
            detections: [{ rule_uuid: 'rule-A', detected_at: '2026-10-16T09:56:07.779Z' }],
          },
        };

        expect(evaluate(body.detections, context({}, classify))).toEqual(
          classify.output.detections
        );
        expect(evaluate(body.rule_uuids, context({}, classify))).toEqual(['rule-A']);
        expect(groundingStep()['on-failure']).toEqual({ continue: true });
      });

      it('sends the grounding results to the agent in place of the plain context', () => {
        const message = (steps: Record<string, unknown>) => {
          const template = requireStep('run_discovery_agent').with?.message;
          if (typeof template !== 'string') throw new Error('Expected the agent message template');
          return createWorkflowLiquidEngine().parseAndRenderSync(template, {
            steps: { ...withClassify({ output: { rows: rawRows } }).steps, ...steps },
          });
        };
        const plain = { output: { query_kis: [] } };
        const grounded = { output: { query_kis: [], grounding: [{ rule_uuid: 'rule-A' }] } };

        expect(
          message({ get_discovery_grounding: grounded, get_discovery_context: plain })
        ).toContain(JSON.stringify(grounded.output));
        expect(message({ get_discovery_context: plain })).toContain(JSON.stringify(plain.output));
        expect(message({})).not.toContain('Prefetched context');
      });
    });

    it('adds the context to the agent message only when the step returned one', () => {
      const fetched = { query_kis: [], unmatched_rule_uuids: ['rule-A'] };

      expect(renderMessage({ output: fetched })).toContain(
        `## Prefetched context\n\n${JSON.stringify(fetched)}`
      );
      expect(renderMessage(undefined)).not.toContain('Prefetched context');
      expect(renderMessage({ error: { message: 'boom' } })).not.toContain('Prefetched context');
    });
  });

  describe('stamping skipped detections', () => {
    const gate = () => requireStep('stamp_skipped_detections').condition;
    const countContext = (classify: unknown) => ({
      steps: {
        classify_detections: classify,
        count_skipped_rules: {
          output: {
            skippedRuleCount: evaluate(
              requireStep('count_skipped_rules').with?.skippedRuleCount,
              withClassify(classify)
            ),
          },
        },
      },
    });

    it('runs right after classification and before the run can exit for lack of work', () => {
      const order = [
        'classify_detections',
        'count_skipped_rules',
        'stamp_skipped_detections',
        'compute_batch_size',
        'maybe_exit_no_work',
        'run_discovery_agent',
      ].map(topLevelIndex);

      expect(order.every((index) => index >= 0)).toBe(true);
      expect([...order].sort((a, b) => a - b)).toEqual(order);
    });

    it('stamps only when the classifier skipped at least one rule', () => {
      expect(evaluate(gate(), countContext({ output: { skipped_rule_uuids: ['rule-A'] } }))).toBe(
        true
      );
      expect(evaluate(gate(), countContext({ output: { skipped_rule_uuids: [] } }))).toBe(false);
    });

    it('never stamps when the classifier failed or produced no output', () => {
      expect(evaluate(gate(), countContext({ error: { message: 'boom' } }))).toBe(false);
      expect(evaluate(gate(), countContext(undefined))).toBe(false);
    });

    it('takes the skipped rules from the classifier, not from the agent summary', () => {
      const backlog = JSON.stringify(requireStep('get_skipped_rules_backlog'));

      expect(backlog).toContain('steps.classify_detections.output.skipped_rule_uuids');
      expect(backlog).not.toContain('written_rule_uuids');
    });

    it('writes processed markers through the same internal route as the agent path, plus why', () => {
      const { body: skippedBody, ...skipped } = requireStep('write_skipped_marker').with ?? {};
      const { body: writtenBody, ...written } = requireStep('write_processed_marker').with ?? {};
      const { skip, ...markerBody } = skippedBody as Record<string, unknown>;

      expect(skipped).toEqual(written);
      expect(markerBody).toEqual(writtenBody);
      expect(typeof skip).toBe('string');
    });

    describe('the reason stored on a skipped marker', () => {
      const skipExpression = () =>
        (requireStep('write_skipped_marker').with?.body as Record<string, unknown>).skip;
      const decisions = [
        { rule_uuid: 'rule-A', decision: 'needs_agent', reason: 'not_live_member' },
        {
          rule_uuid: 'rule-B',
          decision: 'skip',
          reason: 'still_breaching',
          probe_status: 'ok',
          baseline: { decision: 'background', value: 150, samples: 60 },
        },
      ];
      const forItem = (item: unknown[]) => ({
        steps: { classify_detections: { output: { decisions } } },
        foreach: { item },
      });

      it("is the classifier's decision for the detection's rule", () => {
        expect(evaluate(skipExpression(), forItem(['detection-B', 'rule-B']))).toEqual(
          decisions[1]
        );
      });

      it('is absent when the classifier has no decision for the rule', () => {
        expect(evaluate(skipExpression(), forItem(['detection-C', 'rule-C']))).toBeUndefined();
      });

      it('is read from the rule_uuid column of the backlog query', () => {
        expect(requireStep('get_skipped_rules_backlog').with?.query).toContain(
          'KEEP detection_id, rule_uuid'
        );
      });
    });

    it('lets a stamping failure pass without failing the run', () => {
      expect(requireStep('get_skipped_rules_backlog')['on-failure']).toEqual({ continue: true });
      expect(requireStep('foreach_stamp_skipped')['iteration-on-failure']).toEqual({
        continue: true,
      });
      expect(requireStep('write_skipped_marker')['on-failure']).toEqual({ continue: true });
    });

    it('leaves the agent stamping path untouched', () => {
      expect(requireStep('maybe_stamp_processed').condition).toBe(
        '${{ steps.run_discovery_agent.error == null and steps.count_written_rules.output.writtenCount > 0 }}'
      );
      expect(requireStep('compute_written_rule_uuids').with?.written_rule_uuids).toBe(
        '${{ steps.run_discovery_agent.output.structured_output.written_rule_uuids | default: [] | uniq }}'
      );
    });
  });

  describe('outputs', () => {
    const classifierOutputs = [
      ['skippedCount', 'number'],
      ['needsAgentCount', 'number'],
      ['classifierShadowMode', 'boolean'],
      ['classifierReasonCounts', 'string'],
      ['classifierProbeStatusCounts', 'string'],
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

    it('reports zeros and empty counts when the classifier produced nothing', () => {
      const outputs = requireStep('output_result').with ?? {};
      const context = { ...withClassify(undefined), inputs: { classifierShadowMode: true } };

      expect(evaluate(outputs.skippedCount, context)).toBe(0);
      expect(evaluate(outputs.needsAgentCount, context)).toBe(0);
      expect(evaluate(outputs.classifierShadowMode, context)).toBe(true);
      expect(evaluate(outputs.classifierReasonCounts, context)).toBe('{}');
      expect(evaluate(outputs.classifierProbeStatusCounts, context)).toBe('{}');
    });

    it('reports the classifier counts, and the configured mode even when it is false', () => {
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
        inputs: { classifierShadowMode: false },
      };

      expect(evaluate(outputs.skippedCount, context)).toBe(2);
      expect(evaluate(outputs.needsAgentCount, context)).toBe(1);
      expect(evaluate(outputs.classifierShadowMode, context)).toBe(false);
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
