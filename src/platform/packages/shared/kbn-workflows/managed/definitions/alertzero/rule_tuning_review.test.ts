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
  steps?: YamlStep[];
  cases?: Array<{ steps?: YamlStep[] }>;
}

const definition = parse(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW.yaml) as {
  consts: Record<string, number>;
  steps: YamlStep[];
};

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [
    step,
    ...flatten(step.steps ?? []),
    ...(step.cases ?? []).flatMap((switchCase) => flatten(switchCase.steps ?? [])),
  ]);

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

/**
 * The exception name is built once in `build_exception_name` and read by both
 * the card (`attach_exception`) and the action input (`propose_exception`), so
 * the card always shows the name that approval creates.
 */
describe('rule_tuning_review exception name', () => {
  const NAME_STEP = 'build_exception_name';
  const NAME_OUTPUT = '{{ steps.build_exception_name.output.name }}';
  const RULE_NAME = 'Seeded rule for timestamp override backtest';
  const MAX_NAME_LENGTH = 256;

  const nameTemplate = stepByName(NAME_STEP)?.with?.name as string;

  const renderName = (exceptionName: unknown, ruleName: string = RULE_NAME): string =>
    createWorkflowLiquidEngine().parseAndRenderSync(nameTemplate, {
      steps: {
        diagnose_rule: { output: { structured_output: { exception_name: exceptionName } } },
        fetch_rule: { output: { name: ruleName } },
      },
      consts: definition.consts,
    });

  it('mirrors the action name bound in consts', () => {
    expect(definition.consts.max_exception_name_length).toBe(MAX_NAME_LENGTH);
  });

  it('is a data.set step that runs only for an exception recommendation', () => {
    const step = stepByName(NAME_STEP);
    expect(step?.type).toBe('data.set');
    expect(step?.if).toContain("change_type == 'exception'");
  });

  it('runs after diagnose_rule and before both steps that read it', () => {
    const index = (name: string) => allSteps.findIndex((step) => step.name === name);
    expect(index(NAME_STEP)).toBeGreaterThan(index('diagnose_rule'));
    expect(index(NAME_STEP)).toBeLessThan(index('attach_exception'));
    expect(index(NAME_STEP)).toBeLessThan(index('propose_exception'));
  });

  it('feeds the card and the action input from the same output', () => {
    const card = (stepByName('attach_exception')?.with?.data as { name: string }).name;
    const actionInput = (
      stepByName('propose_exception')?.with?.inputs as { actionInput: { name: string } }
    ).actionInput.name;
    expect(card).toBe(NAME_OUTPUT);
    expect(actionInput).toBe(NAME_OUTPUT);
  });

  describe('name template', () => {
    it('uses the descriptive name from the agent', () => {
      expect(renderName('Known non-threat hosts excluded from indicator match')).toBe(
        'Known non-threat hosts excluded from indicator match'
      );
    });

    it('trims whitespace around the agent name', () => {
      expect(renderName('  Known backup agent runs  ')).toBe('Known backup agent runs');
    });

    it.each([
      ['missing', undefined],
      ['null', null],
      ['empty', ''],
      ['blank', '   '],
    ])('falls back to "Tuning: <rule name>" when the agent name is %s', (_label, value) => {
      expect(renderName(value)).toBe(`Tuning: ${RULE_NAME}`);
    });

    it('cuts an agent name longer than the action limit', () => {
      expect(renderName('a'.repeat(MAX_NAME_LENGTH + 44))).toBe('a'.repeat(MAX_NAME_LENGTH));
    });

    it('keeps an agent name of exactly the limit', () => {
      expect(renderName('b'.repeat(MAX_NAME_LENGTH))).toBe('b'.repeat(MAX_NAME_LENGTH));
    });

    it('keeps the fallback within the action limit for a long rule name', () => {
      const rendered = renderName(undefined, 'r'.repeat(MAX_NAME_LENGTH));
      expect(rendered).toHaveLength(MAX_NAME_LENGTH);
      expect(rendered.startsWith('Tuning: ')).toBe(true);
    });
  });

  describe('diagnose_rule schema', () => {
    interface SchemaArm {
      properties: Record<string, { const?: string; type?: string }>;
      required: string[];
    }
    const { oneOf: arms } = stepByName('diagnose_rule')?.with?.schema as { oneOf: SchemaArm[] };
    const armFor = (changeType: string) =>
      arms.find(({ properties }) => properties.change_type.const === changeType);

    it('asks the exception arm for a string exception_name', () => {
      expect(armFor('exception')?.properties.exception_name?.type).toBe('string');
      expect(armFor('exception')?.required).toContain('exception_name');
    });

    it('leaves every other arm without exception_name', () => {
      const others = arms.filter(({ properties }) => properties.change_type.const !== 'exception');
      expect(others).toHaveLength(5);
      others.forEach(({ properties }) => expect(properties.exception_name).toBeUndefined());
    });
  });
});

/**
 * The proposal comment is what an analyst reads in AlertZero before approving. For an
 * exception it must name the exception and list its conditions. `bound_exception_entries`
 * hands the entries over as a JSON string, which a Liquid `for` loop cannot parse inline.
 */
describe('rule_tuning_review proposal comment for an exception', () => {
  const EXCEPTION_NAME = 'Known non-threat hosts excluded from indicator match';
  const commentTemplate = stepByName('compose_proposal')?.with?.comment as string;

  const entriesJson = JSON.stringify([
    { field: 'user.name', operator: 'is', value: 'svc-backup' },
    { field: 'host.name', operator: 'is_one_of', values: ['jump-box-03', 'db-host-11'] },
    { field: 'process.parent.name', operator: 'exists' },
  ]);

  const renderComment = (): string =>
    createWorkflowLiquidEngine().parseAndRenderSync(commentTemplate, {
      inputs: { fp_count: 12, alert_ids: ['a', 'b'], last_fp_at: '2026-10-30T10:56:58.555Z' },
      steps: {
        diagnose_rule: {
          output: {
            structured_output: {
              change_type: 'exception',
              title: 'Exclude benign backup agent',
              summary: 'A known backup service triggers this rule.',
            },
          },
        },
        compose_evidence: { output: { rule_line: 'Rule: Backup', fp_summary: '12 of 12' } },
        fetch_rule: { output: { name: 'Backup', type: 'query' } },
        bound_exception_entries: { output: { entries_json: entriesJson } },
        build_exception_name: { output: { name: EXCEPTION_NAME } },
      },
      consts: definition.consts,
    });

  const exceptionSection = (): string => {
    const comment = renderComment();
    const start = comment.indexOf('Proposed exception:');
    return start === -1 ? '' : comment.slice(start, comment.indexOf('Approve to add', start));
  };

  it('lists every condition as a bullet', () => {
    const section = exceptionSection();
    expect(section).toContain('- user.name is svc-backup');
    expect(section).toContain('- host.name is_one_of jump-box-03, db-host-11');
    expect(section).toContain('- process.parent.name exists');
  });

  it('renders no empty bullet', () => {
    expect(exceptionSection()).not.toMatch(/^- *$/m);
  });

  it('names the exception under "Proposed exception:", before the conditions', () => {
    const section = exceptionSection();
    expect(section).toContain(EXCEPTION_NAME);
    expect(section.indexOf(EXCEPTION_NAME)).toBeLessThan(section.indexOf('- user.name'));
  });
});
