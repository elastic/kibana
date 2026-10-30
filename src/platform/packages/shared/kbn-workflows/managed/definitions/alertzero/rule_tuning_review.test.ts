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

describe('rule_tuning_review schedule look-backs', () => {
  const engine = createWorkflowLiquidEngine();
  const lookbacksTemplate = stepByName('compute_schedule_lookbacks')?.with?.lookbacks as string;

  const renderLookbacks = (
    interval: string,
    from: string,
    proposedInterval: string,
    proposedFrom: string,
    changeType: string = 'schedule'
  ): string =>
    engine.parseAndRenderSync(lookbacksTemplate, {
      consts: definition.consts,
      steps: {
        fetch_rule: { output: { interval, from } },
        diagnose_rule: {
          output: {
            structured_output: {
              change_type: changeType,
              proposed_interval: proposedInterval,
              proposed_from: proposedFrom,
            },
          },
        },
      },
    });

  it('computes look-backs as from minus interval, in the largest whole unit', () => {
    expect(renderLookbacks('5m', 'now-65m', '5m', 'now-6m')).toBe('1h,1m,4200,660');
    expect(renderLookbacks('5m', 'now-5m', '1h', 'now-90m')).toBe('0s,30m,600,9000');
    expect(renderLookbacks('30s', 'now-95s', '1d', 'now-2d')).toBe('65s,1d,125,259200');
  });

  // Two runs one interval apart, each searching its own `from`: 5m + 6m. A rule
  // whose schedule is not changing searches the same window twice.
  it('computes how far back each preview searched', () => {
    expect(renderLookbacks('5m', 'now-6m', '', '', 'query')).toBe('1m,1m,660,660');
  });

  it('computes no look-backs for date math it cannot reduce to a duration', () => {
    expect(renderLookbacks('5m', 'now-1h/d', '5m', 'now-6m')).toBe('');
    expect(renderLookbacks('5m', 'now-3m', '5m', 'now-6m')).toBe('');
  });
});

describe('rule_tuning_review applied threshold cardinality', () => {
  const engine = createWorkflowLiquidEngine();

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

describe('rule_tuning_review proposal text', () => {
  const engine = createWorkflowLiquidEngine();

  // The steps that build the proposal text, run in workflow order with their `if`
  // conditions, the way the workflow run renders them.
  const textSteps = [
    'compute_schedule_lookbacks',
    'describe_query_change',
    'describe_exception_change',
    'describe_risk_score_change',
    'describe_threshold_change',
    'describe_schedule_change',
    'describe_backtest',
    'compose_proposal',
  ].map((name) => {
    const step = stepByName(name);
    if (!step) throw new Error(`missing step ${name}`);
    return step;
  });

  const renderComment = (
    structuredOutput: Record<string, unknown>,
    rule: Record<string, unknown>,
    steps: Record<string, unknown> = {},
    lastFpAt: string = '2026-10-28T16:53:00Z'
  ): string => {
    const context: { steps: Record<string, unknown> } & Record<string, unknown> = {
      inputs: { fp_count: 12, alert_ids: Array(12).fill('a'), last_fp_at: lastFpAt },
      consts: definition.consts,
      steps: {
        compose_evidence: { output: { rule_line: '**Rule:** Example', fp_summary: '12 FPs.' } },
        diagnose_rule: {
          output: {
            structured_output: { title: 'Title', summary: 'Summary.', ...structuredOutput },
          },
        },
        fetch_rule: { output: { type: 'query', interval: '5m', from: 'now-6m', ...rule } },
        can_preview_query_change: { output: { supported: true } },
        compute_schedule_preview_runs: { output: { proposed_invocation_count: 1 } },
        record_preview_outcome: {
          output: {
            current_succeeded: true,
            current_is_aborted: false,
            current_alert_count: 7,
            proposed_succeeded: true,
            proposed_is_aborted: false,
            proposed_alert_count: 3,
            current_error_text: '',
            proposed_error_text: '',
          },
        },
        ...steps,
      },
    };
    for (const step of textSteps) {
      // A skipped step leaves no output, as in a run.
      if (!step.if || engine.evalValueSync(step.if.trim().slice(3, -2), context)) {
        const output = Object.fromEntries(
          Object.entries(step.with ?? {}).map(([key, value]) => [
            key,
            engine.parseAndRenderSync(String(value), context),
          ])
        );
        context.steps[step.name] = { output };
      }
    }
    return (context.steps.compose_proposal as { output: { comment: string } }).output.comment;
  };

  // The "Proposed change" section, up to the next section.
  const proposedChange = (comment: string): string =>
    comment
      .slice(comment.indexOf('**Proposed change**'))
      .split(/\n\n(?=\*\*Backtest\*\*|No backtest)/)[0];

  const backtest = (comment: string): string =>
    comment.includes('**Backtest**') ? comment.slice(comment.indexOf('**Backtest**')) : '';

  const exceptionEntries = (entries: unknown[]) => ({
    bound_exception_entries: { output: { entries_json: JSON.stringify(entries) } },
  });

  const restore = 'You can restore the previous version using History on the rule details page.';

  it.each([
    [
      'query',
      { change_type: 'query', proposed_query: 'a and not b' },
      { query: 'a' },
      {},
      [
        'Current query:',
        '```',
        'a',
        '```',
        '',
        'Proposed query:',
        '```',
        'a and not b',
        '```',
        '',
        `Approve to change the query of the rule. ${restore}`,
      ],
    ],
    [
      'exception',
      { change_type: 'exception' },
      {},
      exceptionEntries([{ field: 'host.name', operator: 'is_one_of', values: ['a', 'b'] }]),
      [
        'Add exception:',
        '```',
        'host.name is one of a, b',
        '```',
        '',
        "Approve to add the exception to the exception list of the rule. You can remove it in the rule's Exceptions tab.",
      ],
    ],
    [
      'risk score',
      { change_type: 'risk_score', proposed_risk_score: 21, proposed_severity: 'low' },
      { risk_score: 73, severity: 'high' },
      {},
      [
        'Risk score: `73` → `21`',
        'Severity: `high` → `low`',
        '',
        `Approve to change the risk score and severity of the rule. ${restore}`,
      ],
    ],
    [
      'threshold',
      {
        change_type: 'threshold',
        proposed_threshold_value: 10,
        proposed_threshold_field: ['host.name'],
        proposed_threshold_cardinality: [],
      },
      { threshold: { value: 3, field: ['host.name'] } },
      {},
      [
        'Threshold: `3` → `10`',
        '',
        `Approve to change the threshold settings of the rule. ${restore}`,
      ],
    ],
    [
      'schedule',
      { change_type: 'schedule', proposed_interval: '5m', proposed_from: 'now-6m' },
      { interval: '5m', from: 'now-65m' },
      {},
      [
        'Additional look-back time: `1h` → `1m`',
        '',
        `Approve to change the schedule settings of the rule. ${restore}`,
      ],
    ],
  ])('describes a %s change and how to undo it', (_, structuredOutput, rule, steps, lines) => {
    expect(proposedChange(renderComment(structuredOutput, rule, steps))).toBe(
      ['**Proposed change**', ...lines].join('\n')
    );
  });

  it('lists every setting that changes, with "none" for an empty one', () => {
    const comment = renderComment(
      {
        change_type: 'threshold',
        proposed_threshold_value: 3,
        proposed_threshold_field: ['host.name', 'user.name'],
        proposed_threshold_cardinality: [{ field: 'user.name', value: 2 }],
      },
      { threshold: { value: 3, field: ['host.name'] } }
    );
    expect(proposedChange(comment)).toContain(
      'Group by: `host.name` → `host.name, user.name`\nUnique values count: `none` → `user.name >= 2`'
    );
    expect(proposedChange(comment)).not.toContain('Threshold:');
  });

  it('joins exception conditions with AND, one per line', () => {
    const comment = renderComment(
      { change_type: 'exception' },
      {},
      exceptionEntries([
        { field: 'host.name', operator: 'is', value: 'a' },
        { field: 'user.name', operator: 'does_not_exist' },
      ])
    );
    expect(proposedChange(comment)).toContain(
      '```\nhost.name is a\nAND user.name does not exist\n```'
    );
  });

  it('shows the raw `from` when the look-back is not a plain duration', () => {
    const comment = renderComment(
      { change_type: 'schedule', proposed_interval: '10m', proposed_from: 'now-11m' },
      { interval: '5m', from: 'now-1h/d' }
    );
    expect(proposedChange(comment)).toContain(
      'Runs every: `5m` → `10m`\nAnalyzed time range starts at: `now-1h/d` → `now-11m`'
    );
    expect(backtest(comment)).toContain(
      'The backtest ends at the newest false positive, October 28 at 16:53 UTC.'
    );
  });

  it('says what period the backtest replayed', () => {
    expect(
      backtest(renderComment({ change_type: 'query', proposed_query: 'b' }, { query: 'a' }))
    ).toBe(
      [
        '**Backtest**',
        'The backtest replayed the rule from 16:42 to 16:53 UTC on October 28 (11 minutes), ending at the newest false positive.',
        '',
        'Alerts with the current rule: 7',
        'Alerts with the proposed change: 3',
      ].join('\n')
    );
  });

  it("gives each schedule's own backtest window", () => {
    const comment = renderComment(
      { change_type: 'schedule', proposed_interval: '10m', proposed_from: 'now-11m' },
      { interval: '5m', from: 'now-65m' }
    );
    expect(backtest(comment)).toContain(
      'The backtest replayed the current schedule from 15:43 to 16:53 UTC on October 28 (70 minutes), and the proposed schedule from 16:42 to 16:53 UTC on October 28 (11 minutes), both ending at the newest false positive.'
    );
  });

  it('gives full dates when the backtest crosses midnight', () => {
    const comment = renderComment(
      { change_type: 'query', proposed_query: 'b' },
      { query: 'a' },
      {},
      '2026-10-28T00:05:00Z'
    );
    expect(backtest(comment)).toContain(
      'The backtest replayed the rule from October 27 at 23:54 to October 28 at 00:05 UTC (11 minutes)'
    );
  });

  it('explains a missing backtest and has none for a risk score change', () => {
    const unsupported = renderComment(
      { change_type: 'exception' },
      { type: 'esql' },
      {
        ...exceptionEntries([{ field: 'host.name', operator: 'is', value: 'a' }]),
        can_preview_query_change: { output: { supported: false } },
      }
    );
    expect(unsupported).toContain(
      'No backtest is available for this change.\nThe preview cannot apply an exception to an ES|QL rule, which has no filters.'
    );
    expect(
      renderComment(
        { change_type: 'risk_score', proposed_risk_score: 21, proposed_severity: 'low' },
        { risk_score: 73, severity: 'high' }
      )
    ).not.toMatch(/Backtest|No backtest/);
  });

  it('hands off a manual change without an undo sentence', () => {
    const comment = renderComment({ change_type: 'manual' }, {});
    expect(comment).toContain('**Proposed change**\nNo automated change is safe for this rule.');
    expect(comment).not.toContain('Approve to');
  });

  it.each(['query', 'exception', 'risk_score', 'threshold', 'schedule', 'manual'])(
    'spaces a %s proposal with one blank line between sections',
    (changeType) => {
      const comment = renderComment(
        {
          change_type: changeType,
          proposed_query: 'b',
          proposed_risk_score: 21,
          proposed_severity: 'low',
          proposed_threshold_value: 10,
          proposed_threshold_field: ['host.name'],
          proposed_threshold_cardinality: [],
          proposed_interval: '5m',
          proposed_from: 'now-6m',
        },
        {
          query: 'a',
          risk_score: 73,
          severity: 'high',
          from: changeType === 'schedule' ? 'now-65m' : 'now-6m',
          threshold: { value: 3, field: ['host.name'] },
        },
        exceptionEntries([{ field: 'host.name', operator: 'is', value: 'a' }])
      );
      expect(comment).not.toMatch(/\n\n\n/);
      expect(comment).not.toMatch(
        /\*\*(Why this rule needs tuning|Summary|Proposed change|Backtest)\*\*\n\n/
      );
    }
  );
});
