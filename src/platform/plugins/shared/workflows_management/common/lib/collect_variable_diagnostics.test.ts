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

/** A workflow of `stepCount` console steps, each holding `varsPerStep` references. */
const buildWorkflow = (stepCount: number, varsPerStep: number): string => {
  const lines = [
    "version: '1'",
    'name: budget-fixture',
    'enabled: true',
    'triggers:',
    '  - type: manual',
    'consts:',
    '  seed: hello',
    'steps:',
  ];
  for (let i = 0; i < stepCount; i++) {
    const refs = Array.from({ length: varsPerStep }, () => '{{ consts.seed }}').join(' ');
    lines.push(
      `  - name: step_${i}`,
      '    type: console',
      '    with:',
      '      message: >-',
      `        ${refs}`
    );
  }
  return lines.join('\n');
};

/** A single step holding `tagCount` Liquid for-loop tags and no `{{ ... }}` references. */
const buildTagWorkflow = (tagCount: number): string => {
  const tags = Array.from(
    { length: tagCount },
    () => '{% for item in consts.items %}x{% endfor %}'
  ).join(' ');
  return [
    "version: '1'",
    'name: tag-fixture',
    'enabled: true',
    'triggers:',
    '  - type: manual',
    'consts:',
    '  items:',
    '    - a',
    'steps:',
    '  - name: step_0',
    '    type: console',
    '    with:',
    '      message: >-',
    `        ${tags}`,
  ].join('\n');
};

const validate = (yaml: string) =>
  validateWorkflowYaml(yaml, schema, {
    variableValidationRegistry: createMockWorkflowContextRegistry(),
  });

describe('variable validation budgets', () => {
  it('validates a workflow at the step limit', () => {
    const result = validate(buildWorkflow(MAX_STEPS_FOR_VARIABLE_VALIDATION, 1));

    expect(result.validationNotRun).toBeUndefined();
  });

  it('skips and reports when the step count is over the limit', () => {
    const stepCount = MAX_STEPS_FOR_VARIABLE_VALIDATION + 1;
    const result = validate(buildWorkflow(stepCount, 1));

    expect(result.diagnostics.filter(({ source }) => source === 'variable')).toEqual([]);
    expect(result.validationNotRun).toEqual([
      `Variable validation skipped: the workflow has ${stepCount} steps, above the limit of ${MAX_STEPS_FOR_VARIABLE_VALIDATION}.`,
    ]);
  });

  it('reports a partial result when the variable count is over the limit', () => {
    const result = validate(buildWorkflow(1, MAX_VARIABLES_FOR_VARIABLE_VALIDATION + 1));

    expect(result.validationNotRun).toEqual([
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
    expect(validate(yaml).validationNotRun).toHaveLength(1);
  });

  it('reports a partial result when Liquid for-loops are over the limit', () => {
    // Zero `{{ ... }}` references, so only the for-loop budget can stop this.
    const result = validate(buildTagWorkflow(MAX_FOR_LOOP_SCOPES_FOR_VARIABLE_VALIDATION + 1));

    expect(result.validationNotRun).toEqual([
      `Variable validation is partial: the workflow has more than ${MAX_FOR_LOOP_SCOPES_FOR_VARIABLE_VALIDATION} Liquid for-loops, so the rest of it was not checked.`,
    ]);
  });

  it('validates a workflow at the for-loop limit', () => {
    const result = validate(buildTagWorkflow(MAX_FOR_LOOP_SCOPES_FOR_VARIABLE_VALIDATION));

    expect(result.validationNotRun).toBeUndefined();
  });

  it('does not exhaust the heap on a workflow at the route body limit', () => {
    // Before the budgets, a body this size took the whole Node process down.
    const yaml = buildWorkflow(20000, 5).slice(0, MAX_WORKFLOW_YAML_LENGTH);

    const result = validate(yaml);

    expect(result.validationNotRun).toHaveLength(1);
  });
});
