/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils';

/**
 * Guards the fail-closed handling of oversized exception recommendations.
 * Exception entries are ANDed and `is_not_one_of` values are exclusionary
 * constraints, so silently truncating either one broadens the exception:
 * entities the recommendation excluded become eligible for suppression.
 * The overflow template in `check_exception_entries` must therefore render
 * "true" exactly when either platform bound is exceeded, and the run must
 * fail via `workflow.fail` before any truncation happens.
 */

interface YamlStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
}

const definition = parse(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW.yaml) as {
  consts: Record<string, number>;
  steps: YamlStep[];
};

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(((step as any).steps ?? []) as YamlStep[])]);

const allSteps = flatten(definition.steps);
const stepByName = (name: string) => allSteps.find((step) => step.name === name);

const MAX_ENTRIES = definition.consts.max_exception_entries;
const MAX_VALUES = definition.consts.max_exception_values;

const overflowTemplate = stepByName('check_exception_entries')?.with?.overflow as string;

const renderOverflow = (exceptionEntries: unknown): string =>
  createWorkflowLiquidEngine().parseAndRenderSync(overflowTemplate, {
    steps: {
      diagnose_rule: { output: { structured_output: { exception_entries: exceptionEntries } } },
    },
    consts: definition.consts,
  });

describe('rule_tuning_review oversized exception handling', () => {
  it('declares the platform bounds the platform exception schema enforces', () => {
    expect(MAX_ENTRIES).toBe(100);
    expect(MAX_VALUES).toBe(1000);
  });

  it('fails the run (workflow.fail) when the recommendation overflows either bound', () => {
    const fail = stepByName('reject_oversized_exception');
    expect(fail).toBeDefined();
    expect(fail?.type).toBe('workflow.fail');
    expect(fail?.if).toContain("steps.check_exception_entries.output.overflow == 'true'");
    // The failure precedes any truncating step.
    const failIndex = allSteps.findIndex((step) => step.name === 'reject_oversized_exception');
    const boundIndex = allSteps.findIndex((step) => step.name === 'bound_exception_entries');
    expect(failIndex).toBeGreaterThanOrEqual(0);
    expect(boundIndex).toBeGreaterThan(failIndex);
  });

  describe('overflow template (reproduction of the truncation-broadening bug)', () => {
    const entry = (values: string[]) => ({ field: 'host.name', operator: 'is_not_one_of', values });
    const nStrings = (n: number) => Array.from({ length: n }, (_, i) => `v${i}`);

    it('renders true when the entry list exceeds max_exception_entries', () => {
      // Regression: pre-fix, the 101st entry (an ANDed constraint) was dropped,
      // silently broadening the exception.
      expect(renderOverflow(nStrings(MAX_ENTRIES + 1).map((v) => entry([v])))).toBe('true');
    });

    it('renders true when one entry exceeds max_exception_values', () => {
      // Regression: pre-fix, a sliced is_not_one_of list made the omitted
      // entities eligible for suppression.
      expect(renderOverflow([entry(nStrings(MAX_VALUES + 1))])).toBe('true');
    });

    // The gate compares the rendered value to 'true', so several violations must
    // not concatenate into 'truetrue' and skip workflow.fail.
    it('renders exactly true when two entries each exceed max_exception_values', () => {
      expect(
        renderOverflow([entry(nStrings(MAX_VALUES + 1)), entry(nStrings(MAX_VALUES + 1))])
      ).toBe('true');
    });

    it('renders exactly true when entries exceed the cap and one entry also exceeds max_exception_values', () => {
      const entries = nStrings(MAX_ENTRIES + 1).map((v) => entry([v]));
      entries[0] = entry(nStrings(MAX_VALUES + 1));
      expect(renderOverflow(entries)).toBe('true');
    });

    it('renders empty (no overflow) for an at-cap recommendation', () => {
      expect(renderOverflow(nStrings(MAX_ENTRIES).map((v) => entry([v]))).trim()).toBe('');
      expect(renderOverflow([entry(nStrings(MAX_VALUES))]).trim()).toBe('');
    });

    it('renders empty for a small recommendation', () => {
      expect(renderOverflow([entry(['a', 'b']), { field: 'k', operator: 'exists' }]).trim()).toBe(
        ''
      );
    });
  });
});

describe('rule_tuning_review proposed change', () => {
  const engine = createWorkflowLiquidEngine();
  const commentTemplate = stepByName('compose_proposal')?.with?.comment as string;
  const lookbacksTemplate = stepByName('compute_schedule_lookbacks')?.with?.lookbacks as string;

  // The "Proposed change" block, through the "Approve ..." line that ends it.
  const renderProposedChange = (
    structuredOutput: Record<string, unknown>,
    rule: Record<string, unknown>,
    steps: Record<string, unknown> = {}
  ): string => {
    const comment = engine.parseAndRenderSync(commentTemplate, {
      inputs: { fp_count: 1, alert_ids: ['a'] },
      steps: {
        diagnose_rule: { output: { structured_output: structuredOutput } },
        fetch_rule: { output: rule },
        ...steps,
      },
    });
    const start = comment.indexOf('**Proposed change**');
    return comment.slice(start, comment.indexOf('\n', comment.indexOf('\nApprove', start) + 1));
  };

  const renderLookbacks = (
    interval: string,
    from: string,
    proposedInterval: string,
    proposedFrom: string
  ): string =>
    engine.parseAndRenderSync(lookbacksTemplate, {
      steps: {
        fetch_rule: { output: { interval, from } },
        diagnose_rule: {
          output: {
            structured_output: {
              change_type: 'schedule',
              proposed_interval: proposedInterval,
              proposed_from: proposedFrom,
            },
          },
        },
      },
    });

  it('lists only the threshold settings that change, with "none" for an empty cardinality', () => {
    expect(
      renderProposedChange(
        {
          change_type: 'threshold',
          proposed_threshold_value: 10,
          proposed_threshold_field: ['host.name'],
          proposed_threshold_cardinality: [],
        },
        { threshold: { value: 3, field: ['host.name'] } }
      )
    ).toBe(
      [
        '**Proposed change**',
        'Threshold: `3` → `10`',
        'Approve to change the threshold settings of the rule. You can restore the previous version using History on the rule details page.',
      ].join('\n')
    );

    expect(
      renderProposedChange(
        {
          change_type: 'threshold',
          proposed_threshold_value: 3,
          proposed_threshold_field: ['host.name', 'user.name'],
          proposed_threshold_cardinality: [{ field: 'user.name', value: 2 }],
        },
        { threshold: { value: 3, field: ['host.name'], cardinality: [] } }
      )
    ).toContain(
      'Group by: `host.name` → `host.name, user.name`\nUnique values count: `none` → `user.name >= 2`'
    );
  });

  it('shows the schedule as the rule details page does and skips an unchanged interval', () => {
    expect(
      renderProposedChange(
        { change_type: 'schedule', proposed_interval: '5m', proposed_from: 'now-6m' },
        { interval: '5m', from: 'now-65m' },
        { compute_schedule_lookbacks: { output: { lookbacks: '1h,1m' } } }
      )
    ).toBe(
      [
        '**Proposed change**',
        'Additional look-back time: `1h` → `1m`',
        'Approve to change the schedule settings of the rule. You can restore the previous version using History on the rule details page.',
      ].join('\n')
    );
  });

  it('falls back to the raw `from` when the look-back cannot be computed', () => {
    expect(
      renderProposedChange(
        { change_type: 'schedule', proposed_interval: '10m', proposed_from: 'now-11m' },
        { interval: '5m', from: 'now-1h/d' },
        { compute_schedule_lookbacks: { output: { lookbacks: '' } } }
      )
    ).toContain('Runs every: `5m` → `10m`\nAnalyzed time range starts at: `now-1h/d` → `now-11m`');
  });

  it('describes the backtest schedule with the look-back instead of date math', () => {
    const comment = engine.parseAndRenderSync(commentTemplate, {
      inputs: { fp_count: 1, alert_ids: ['a'], last_fp_at: '2026-10-01T00:00:00Z' },
      consts: definition.consts,
      steps: {
        diagnose_rule: {
          output: {
            structured_output: {
              change_type: 'schedule',
              proposed_interval: '5m',
              proposed_from: 'now-6m',
            },
          },
        },
        fetch_rule: { output: { interval: '5m', from: 'now-65m' } },
        can_preview_query_change: { output: { supported: true } },
        compute_schedule_lookbacks: { output: { lookbacks: '1h,1m' } },
        compute_schedule_preview_runs: { output: { proposed_invocation_count: 2 } },
      },
    });
    expect(comment).toContain(
      'The backtest ran 2 simulated executions, running every `5m` with `1h` additional look-back time.'
    );
    expect(comment).toContain(
      'The proposed schedule ran 2 simulated executions, running every `5m` with `1m` additional look-back time, over the same time span.'
    );
    expect(comment).not.toContain('now-65m');
  });

  it('computes look-backs as from minus interval, in the largest whole unit', () => {
    expect(renderLookbacks('5m', 'now-65m', '5m', 'now-6m')).toBe('1h,1m');
    expect(renderLookbacks('5m', 'now-5m', '1h', 'now-90m')).toBe('0s,30m');
    expect(renderLookbacks('30s', 'now-95s', '1d', 'now-2d')).toBe('65s,1d');
  });

  it('computes no look-backs for date math it cannot reduce to a duration', () => {
    expect(renderLookbacks('5m', 'now-1h/d', '5m', 'now-6m')).toBe('');
    expect(renderLookbacks('5m', 'now-3m', '5m', 'now-6m')).toBe('');
  });

  it('says the exception is added and uses the exceptions UI operator names', () => {
    expect(
      renderProposedChange(
        { change_type: 'exception' },
        {},
        {
          bound_exception_entries: {
            output: {
              entries_json: JSON.stringify([
                { field: 'host.name', operator: 'is_one_of', values: ['admin-04', 'build-02'] },
              ]),
            },
          },
        }
      )
    ).toBe(
      [
        '**Proposed change**',
        'Add exception: `host.name` is one of `admin-04`, `build-02`',
        "Approve to add the exception to the exception list of the rule. You can remove it in the rule's Exceptions tab.",
      ].join('\n')
    );
  });

  it('ends every change type that edits the rule with how to undo it', () => {
    expect(
      renderProposedChange({ change_type: 'query', proposed_query: 'a and not b' }, { query: 'a' })
    ).toContain(
      'Approve to change the query of the rule. You can restore the previous version using History on the rule details page.'
    );
    expect(
      renderProposedChange(
        { change_type: 'risk_score', proposed_risk_score: 21, proposed_severity: 'low' },
        { risk_score: 47, severity: 'medium' }
      )
    ).toBe(
      [
        '**Proposed change**',
        'Risk score: `47` → `21`',
        'Severity: `medium` → `low`',
        'Approve to change the risk score and severity of the rule. You can restore the previous version using History on the rule details page.',
      ].join('\n')
    );
  });

  describe('applied threshold cardinality', () => {
    // `flatten` does not descend into switch cases, so the threshold arm is read directly.
    const { cases } = stepByName('propose_tuning') as unknown as {
      cases: Array<{ match: string; steps: YamlStep[] }>;
    };
    const proposeThreshold = cases
      .find(({ match }) => match === 'threshold')
      ?.steps.find(({ name }) => name === 'propose_threshold');
    const cardinalityExpression = (
      proposeThreshold?.with?.inputs as {
        actionInput: { threshold: { cardinality: string } };
      }
    ).actionInput.threshold.cardinality;
    const clearStep = stepByName('clear_threshold_cardinality');

    const evaluateCardinality = (proposed: unknown, clearing: unknown): unknown =>
      engine.evalValueSync(cardinalityExpression.slice(3, -2), {
        steps: {
          diagnose_rule: {
            output: { structured_output: { proposed_threshold_cardinality: proposed } },
          },
          clear_threshold_cardinality: { output: { cardinality: clearing } },
        },
      });

    it('clears the cardinality only when the rule has one', () => {
      expect(clearStep?.if).toContain('steps.fetch_rule.output.threshold.cardinality.size > 0');
      expect(evaluateCardinality([], [])).toEqual([]);
    });

    it('leaves the cardinality out when the rule has none and the proposal keeps it empty', () => {
      expect(evaluateCardinality([], undefined)).toBeUndefined();
    });

    it('applies a proposed cardinality', () => {
      const proposed = [{ field: 'user.name', value: 2 }];
      expect(evaluateCardinality(proposed, undefined)).toEqual(proposed);
    });
  });
});
