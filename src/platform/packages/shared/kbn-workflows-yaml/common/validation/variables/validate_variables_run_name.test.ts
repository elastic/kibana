/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML, { LineCounter } from 'yaml';
import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { collectAllVariables } from './collect_all_variables';
import { validateVariables } from './validate_variables';
import { createMockWorkflowContextRegistry } from '../context/registry.mock';
import { createStepContextResolver } from '../context/step_context_resolver';

const emptyRegistry = createMockWorkflowContextRegistry();

const validateRunName = (runName: string) => {
  const yaml = `name: Deploy
run-name: "${runName}"
enabled: false
triggers:
  - type: manual
    inputs:
      properties:
        target:
          type: string
steps:
  - name: first
    type: console
    with:
      message: hi
`;
  const lineCounter = new LineCounter();
  const yamlDocument = YAML.parseDocument(yaml, { lineCounter, keepSourceTokens: true });
  const workflowDefinition = yamlDocument.toJSON() as WorkflowYaml;
  const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition);

  const variableItems = collectAllVariables(yaml, yamlDocument, lineCounter, workflowGraph);
  const results = validateVariables(
    createStepContextResolver(emptyRegistry, workflowDefinition, workflowGraph, yamlDocument),
    variableItems,
    workflowDefinition,
    yamlDocument,
    yaml
  );

  return { variableItems, errors: results.filter((result) => result.severity === 'error') };
};

describe('validateVariables run-name', () => {
  it('accepts the initial workflow context', () => {
    const { variableItems, errors } = validateRunName(
      '{{ inputs.target }} {{ workflow.name }} {{ execution.executedBy }}'
    );

    expect(variableItems.map(({ yamlPath }) => yamlPath)).toEqual([
      ['run-name'],
      ['run-name'],
      ['run-name'],
    ]);
    expect(errors).toEqual([]);
  });

  it('rejects step outputs, which do not exist when the execution is created', () => {
    const { errors } = validateRunName('{{ steps.first.output }}');

    expect(errors).toEqual([
      expect.objectContaining({ message: 'Variable steps.first.output is invalid' }),
    ]);
  });
});
