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
        rows: '${{ steps.get_detections.output.values | default: [] }}',
        space_id: '{{ variables.spaceId }}',
        shadow_mode: '${{ inputs.classifierShadowMode }}',
        probe_window_minutes: '${{ inputs.classifierProbeWindowMinutes }}',
        probe_timeout_ms: '${{ inputs.classifierProbeTimeoutMs }}',
        probe_concurrency: '${{ inputs.classifierProbeConcurrency }}',
        budget_ms: '${{ inputs.classifierBudgetMs }}',
      });
    });
  });

  describe('inputs', () => {
    const inputs = discovery.triggers[0].inputs;

    it.each([
      ['classifierShadowMode', 'boolean', true, undefined, undefined],
      ['classifierProbeWindowMinutes', 'number', 60, 15, 360],
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

    it('writes processed markers through the same internal route as the agent path', () => {
      const skipped = requireStep('write_skipped_marker').with;
      const written = requireStep('write_processed_marker').with;

      expect(skipped).toEqual(written);
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
