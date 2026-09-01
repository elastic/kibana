/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowValidationRuleId } from '@kbn/workflows';
import { WORKFLOW_VALIDATION_RULES } from '@kbn/workflows';
import {
  collectAllVariables,
  validateLiquidForLoopCollections,
  validateVariables,
} from '@kbn/workflows-yaml';
import { validateWorkflowYaml } from '../../../../common/lib/validate_workflow_yaml';
import { getWorkflowZodSchema } from '../../../../common/schema';
import { performComputation } from '../../../entities/workflows/store/workflow_detail/utils/computation';

const workflowSchema = getWorkflowZodSchema({}, []);

const VARIABLE_RULE_IDS = (
  Object.keys(WORKFLOW_VALIDATION_RULES) as WorkflowValidationRuleId[]
).filter((ruleId) => WORKFLOW_VALIDATION_RULES[ruleId].owner === 'variable-validation');

/** `ruleId:severity` pairs, sorted, so a set difference is readable on failure. */
const fingerprint = (entries: Array<{ ruleId: string; severity: string }>): string[] =>
  entries.map(({ ruleId, severity }) => `${ruleId}:${severity}`).sort();

const clientFingerprint = (yaml: string): string[] => {
  const { workflowDefinition, workflowGraph, yamlDocument, yamlLineCounter } =
    performComputation(yaml);
  if (!workflowDefinition || !workflowGraph || !yamlDocument || !yamlLineCounter) {
    throw new Error('Expected fixture to parse and build a graph');
  }
  const variableItems = collectAllVariables(yaml, yamlDocument, yamlLineCounter, workflowGraph);
  const results = [
    ...validateVariables(variableItems, workflowGraph, workflowDefinition, yamlDocument, yaml),
    ...validateLiquidForLoopCollections(yaml, yamlDocument, workflowGraph, workflowDefinition),
  ];
  return fingerprint(
    results.flatMap((result) =>
      result.ruleId && result.severity ? [{ ruleId: result.ruleId, severity: result.severity }] : []
    )
  );
};

const serverFingerprint = (yaml: string): string[] =>
  fingerprint(
    validateWorkflowYaml(yaml, workflowSchema, { includeVariableValidation: true })
      .diagnostics.filter(({ source }) => source === 'variable')
      .map(({ ruleId, severity }) => ({ ruleId, severity }))
  );

const workflow = (...steps: string[]): string =>
  [
    "version: '1'",
    'name: variable-parity',
    'enabled: true',
    'triggers:',
    '  - type: manual',
    'consts:',
    '  items:',
    '    - name: first',
    '  count: 3',
    'steps:',
    ...steps,
  ].join('\n');

const FIXTURES: Array<{ name: string; yaml: string }> = [
  {
    name: 'reference to a step that does not exist',
    yaml: workflow(
      '  - name: log',
      '    type: console',
      '    with:',
      '      message: "{{ steps.no_such_step.output.value }}"'
    ),
  },
  {
    name: 'unparseable variable path',
    yaml: workflow(
      '  - name: log',
      '    type: console',
      '    with:',
      '      message: "{{ consts.items | 9bad }}"'
    ),
  },
  {
    name: 'foreach over an untyped collection',
    yaml: workflow(
      '  - name: raw',
      '    type: console',
      '    with:',
      '      message: hello',
      '  - name: iterate',
      '    type: foreach',
      '    foreach: "{{ steps.raw.output.rows }}"',
      '    steps:',
      '      - name: inner',
      '        type: console',
      '        with:',
      '          message: "{{ foreach.item }}"'
    ),
  },
  {
    name: 'for-loop over a collection that does not exist',
    yaml: workflow(
      '  - name: log',
      '    type: console',
      '    with:',
      '      message: "{% for row in steps.no_such_step.output.rows %}{{ row }}{% endfor %}"'
    ),
  },
  {
    name: 'empty variable expression',
    yaml: workflow('  - name: log', '    type: console', '    with:', '      message: "{{ }}"'),
  },
  {
    name: 'foreach over a value that is not a collection',
    yaml: workflow(
      '  - name: iterate',
      '    type: foreach',
      '    foreach: "{{ consts.count }}"',
      '    steps:',
      '      - name: inner',
      '        type: console',
      '        with:',
      '          message: "{{ foreach.item }}"'
    ),
  },
  {
    name: 'valid references only',
    yaml: workflow(
      '  - name: log',
      '    type: console',
      '    with:',
      '      message: "{{ consts.items }}"'
    ),
  },
];

describe('variable-validation client/server parity', () => {
  it.each(FIXTURES)('emits the same rule IDs and severities for $name', ({ yaml }) => {
    expect(serverFingerprint(yaml)).toEqual(clientFingerprint(yaml));
  });

  it('covers every registered variable-validation rule across the fixtures', () => {
    const observed = new Set(
      FIXTURES.flatMap(({ yaml }) => clientFingerprint(yaml)).map((entry) => entry.split(':')[0])
    );
    expect([...observed].sort()).toEqual([...VARIABLE_RULE_IDS].sort());
  });

  it('does not run the variable rules unless asked, so create/update gating is unchanged', () => {
    const { yaml } = FIXTURES[0];
    const diagnostics = validateWorkflowYaml(yaml, workflowSchema).diagnostics;
    expect(diagnostics.filter(({ source }) => source === 'variable')).toEqual([]);
  });
});
