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
