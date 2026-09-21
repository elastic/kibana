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

  it('skips and reports when the variable count is over the limit', () => {
    const varsPerStep = MAX_VARIABLES_FOR_VARIABLE_VALIDATION + 1;
    const result = validate(buildWorkflow(1, varsPerStep));

    expect(result.diagnostics.filter(({ source }) => source === 'variable')).toEqual([]);
    expect(result.validationNotRun).toEqual([
      `Variable validation skipped: the workflow has ${varsPerStep} template references, above the limit of ${MAX_VARIABLES_FOR_VARIABLE_VALIDATION}.`,
    ]);
  });

  it('skips and reports when Liquid tags alone are over the limit', () => {
    const tagCount = MAX_VARIABLES_FOR_VARIABLE_VALIDATION;
    // `{% for %}` and `{% endfor %}` each open a tag.
    const openings = tagCount * 2;
    const result = validate(buildTagWorkflow(tagCount));

    expect(result.diagnostics.filter(({ source }) => source === 'variable')).toEqual([]);
    expect(result.validationNotRun).toEqual([
      `Variable validation skipped: the workflow has ${openings} template references, above the limit of ${MAX_VARIABLES_FOR_VARIABLE_VALIDATION}.`,
    ]);
  });

  it('validates a workflow at the tag limit', () => {
    const result = validate(buildTagWorkflow(MAX_VARIABLES_FOR_VARIABLE_VALIDATION / 2));

    expect(result.validationNotRun).toBeUndefined();
  });

  it('does not exhaust the heap on a workflow at the route body limit', () => {
    // Before the budgets, a body this size took the whole Node process down.
    const yaml = buildWorkflow(20000, 5).slice(0, MAX_WORKFLOW_YAML_LENGTH);

    const result = validate(yaml);

    expect(result.validationNotRun).toHaveLength(1);
  });
});
