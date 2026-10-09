/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_WORKFLOW_YAML_LENGTH } from '@kbn/workflows/types/v1';
import {
  MAX_FOR_LOOP_SCOPES_FOR_VARIABLE_VALIDATION,
  MAX_STEPS_FOR_VARIABLE_VALIDATION,
  MAX_VARIABLES_FOR_VARIABLE_VALIDATION,
} from './collect_variable_diagnostics';
import { createMockWorkflowContextRegistry } from './create_workflow_context_registry.mock';
import { validateWorkflowYaml } from './validate_workflow_yaml';
import { getWorkflowZodSchema } from '../schema';

const schema = getWorkflowZodSchema({}, []);

/** A workflow of `stepCount` console steps, each holding the scalar built for it. */
const buildWorkflowFrom = (
  name: string,
  constsLines: string[],
  stepCount: number,
  scalarFor: (step: number) => string
): string => {
  const lines = ["version: '1'", `name: ${name}`, 'enabled: true', 'triggers:', '  - type: manual'];
  lines.push('consts:', ...constsLines, 'steps:');
  for (let step = 0; step < stepCount; step++) {
    lines.push(
      `  - name: step_${step}`,
      '    type: console',
      '    with:',
      '      message: >-',
      `        ${scalarFor(step)}`
    );
  }
  return lines.join('\n');
};

/** Steps holding `varsPerStep` references each. */
const buildWorkflow = (stepCount: number, varsPerStep: number): string =>
  buildWorkflowFrom('budget-fixture', ['  seed: hello'], stepCount, () =>
    Array.from({ length: varsPerStep }, () => '{{ consts.seed }}').join(' ')
  );

/** A single step holding `tagCount` Liquid for-loop tags and no `{{ ... }}` references. */
const buildTagWorkflow = (tagCount: number): string =>
  buildWorkflowFrom('tag-fixture', ['  items:', '    - a'], 1, () =>
    Array.from({ length: tagCount }, () => '{% for item in consts.items %}x{% endfor %}').join(' ')
  );

/**
 * Steps holding both dimensions at once: assigns up to just under the Liquid
 * engine's 150,000-character parse limit, plus references to them.
 */
const buildAssignHeavyWorkflow = (
  stepCount: number,
  assignsPerStep: number,
  refsPerStep: number
): string =>
  buildWorkflowFrom('assign-heavy-fixture', ['  seed: hello'], stepCount, () =>
    [
      ...Array.from({ length: assignsPerStep }, (_, i) => `{% assign a${i} = consts.seed %}`),
      ...Array.from({ length: refsPerStep }, (_, i) => `{{ a${i % assignsPerStep} }}`),
    ].join(' ')
  );

const validate = (yaml: string) =>
  validateWorkflowYaml(yaml, schema, {
    variableValidationRegistry: createMockWorkflowContextRegistry(),
  });

describe('variable validation budgets', () => {
  it('validates a workflow at the step limit', () => {
    const result = validate(buildWorkflow(MAX_STEPS_FOR_VARIABLE_VALIDATION, 1));

    expect(result.notChecked).toBeUndefined();
  });

  it('skips and reports when the step count is over the limit', () => {
    const stepCount = MAX_STEPS_FOR_VARIABLE_VALIDATION + 1;
    const result = validate(buildWorkflow(stepCount, 1));

    expect(result.diagnostics.filter(({ source }) => source === 'variable')).toEqual([]);
    expect(result.notChecked).toEqual([
      `Variable validation skipped: the workflow has ${stepCount} steps, above the limit of ${MAX_STEPS_FOR_VARIABLE_VALIDATION}.`,
    ]);
  });

  it('reports a partial result when the variable count is over the limit', () => {
    const result = validate(buildWorkflow(1, MAX_VARIABLES_FOR_VARIABLE_VALIDATION + 1));

    expect(result.notChecked).toEqual([
      `Variable validation is partial: the workflow has more than ${MAX_VARIABLES_FOR_VARIABLE_VALIDATION} variable references, so the rest of it was not checked.`,
    ]);
  });

  it('bounds collection on a body at the route limit', () => {
    // ~58,000 short references. Counting them only after collection allocated
    // ~36 MiB, which is the cost the budget exists to avoid.
    const reference = '{{ consts.seed }}';
    const count = Math.floor((MAX_WORKFLOW_YAML_LENGTH - 400) / (reference.length + 1));
    const yaml = buildWorkflow(1, count);

    expect(yaml.length).toBeLessThanOrEqual(MAX_WORKFLOW_YAML_LENGTH);
    expect(validate(yaml).notChecked).toHaveLength(1);
  });

  it('reports a partial result when Liquid for-loops are over the limit', () => {
    // Zero `{{ ... }}` references, so only the for-loop budget can stop this.
    const result = validate(buildTagWorkflow(MAX_FOR_LOOP_SCOPES_FOR_VARIABLE_VALIDATION + 1));

    expect(result.notChecked).toEqual([
      `Variable validation is partial: the workflow has more than ${MAX_FOR_LOOP_SCOPES_FOR_VARIABLE_VALIDATION} Liquid for-loops, so the rest of it was not checked.`,
    ]);
  });

  it('validates a workflow at the for-loop limit', () => {
    const result = validate(buildTagWorkflow(MAX_FOR_LOOP_SCOPES_FOR_VARIABLE_VALIDATION));

    expect(result.notChecked).toBeUndefined();
  });

  it('handles both dimensions at once without a further budget', () => {
    // References at the cap and, behind each one, a scalar of assigns just
    // under the Liquid engine's own 150,000-character parse limit. That limit
    // is what bounds the assign dimension: a larger scalar does not parse, so
    // no template locals are extracted from it at all. Measures ~190 ms and
    // ~11 MiB at the route body limit.
    const yaml = buildAssignHeavyWorkflow(7, 4000, 143);

    const result = validate(yaml);

    // Every reference resolves against an assign in its own scalar.
    expect(result.diagnostics.filter(({ source }) => source === 'variable')).toEqual([]);
    expect(result.notChecked).toEqual([
      `Variable validation is partial: the workflow has more than ${MAX_VARIABLES_FOR_VARIABLE_VALIDATION} variable references, so the rest of it was not checked.`,
    ]);
  });

  it('reports the syntax error of a malformed scalar behind many references', () => {
    // The unterminated tag fails the Liquid parse. That the scalar is parsed
    // once rather than once per reference is pinned where the cache lives, in
    // `extract_template_local_context.test.ts`; this fixture keeps the endpoint
    // path on the same input.
    const yaml = buildWorkflowFrom('malformed-fixture', ['  seed: hello'], 1, () =>
      [
        `{% assign broken = ${'x'.repeat(120_000)}`,
        ...Array.from({ length: MAX_VARIABLES_FOR_VARIABLE_VALIDATION }, () => '{{ consts.seed }}'),
      ].join(' ')
    );

    const result = validate(yaml);

    expect(result.diagnostics.map(({ source }) => source)).toContain('liquid');
    expect(result.notChecked).toBeUndefined();
  });

  it('does not exhaust the heap on a workflow at the route body limit', () => {
    // Before the budgets, a body this size took the whole Node process down.
    const yaml = buildWorkflow(20000, 5).slice(0, MAX_WORKFLOW_YAML_LENGTH);

    const result = validate(yaml);

    expect(result.notChecked).toHaveLength(1);
  });
});
