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

type ValidationModel = Parameters<typeof collectAllVariables>[0];

function createModel(value: string): ValidationModel {
  const lineStarts = [0];
  for (let index = 0; index < value.length; index++) {
    if (value[index] === '\n') {
      lineStarts.push(index + 1);
    }
  }

  return {
    getValue: () => value,
    getPositionAt: (offset: number) => {
      const lineIndex = lineStarts.findLastIndex((lineStart) => lineStart <= offset);
      const lineStart = lineStarts[Math.max(lineIndex, 0)];
      return {
        lineNumber: Math.max(lineIndex, 0) + 1,
        column: offset - lineStart + 1,
      };
    },
    getOffsetAt: ({ lineNumber, column }) => lineStarts[lineNumber - 1] + column - 1,
  } as ValidationModel;
}

describe('validateVariables data.map nested $map bindings', () => {
  it('treats custom nested $map item bindings as valid variables', () => {
    const yaml = `name: Data Map Validation
enabled: false
triggers:
  - type: manual
consts:
  items:
    created_at: "asdf"
    title: "asdf"
    labels:
      - name: bug
steps:
  - name: filter_results
    type: data.map
    items: "\${{ consts.items }}"
    with:
      fields:
        created_at: "\${{ item.created_at }}"
        title: "\${{ item.title }}"
        labels:
          $map: { items: '\${{ item.labels }}', item: 'label' }
          name: "\${{ label.name }}"
`;
    const lineCounter = new LineCounter();
    const yamlDocument = YAML.parseDocument(yaml, { lineCounter, keepSourceTokens: true });
    const workflowDefinition = yamlDocument.toJSON() as WorkflowYaml;
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition);
    const model = createModel(yaml);

    const variableItems = collectAllVariables(model, yamlDocument, workflowGraph);
    const results = validateVariables(
      variableItems,
      workflowGraph,
      workflowDefinition,
      yamlDocument,
      model
    );

    const labelResult = results.find((result) => 'key' in result && result.key === 'label.name');

    expect(labelResult?.message).toBe(null);
    expect(results.filter((result) => result.severity === 'error')).toEqual([]);
  });
});
