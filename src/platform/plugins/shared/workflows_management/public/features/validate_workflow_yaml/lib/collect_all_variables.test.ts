/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import type { monaco } from '@kbn/monaco';
import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowGraph } from '@kbn/workflows/graph';
import { collectAllVariables } from './collect_all_variables';

// Mock Monaco model
const createMockModel = (value: string) => {
  const lines = value.split('\n');

  return {
    getValue: () => value,
    getPositionAt: (offset: number) => {
      let line = 1;
      let column = 1;
      let currentOffset = 0;

      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1; // +1 for newline
        if (currentOffset + lineLength > offset) {
          column = offset - currentOffset + 1;
          break;
        }
        currentOffset += lineLength;
        line++;
      }

      return { lineNumber: line, column };
    },
  } as monaco.editor.ITextModel;
};

describe('collectAllVariables', () => {
  it('should collect mustache template variables', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: Test Step
    action: test
    params:
      value: "{{myVariable}}"
      other: "{{anotherVariable}}"
`;

    const model = createMockModel(yaml);
    const yamlDocument = parseDocument(yaml);
    const workflowDefinition: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'Test Step',
          type: 'test.action',
          with: {
            value: '{{myVariable}}',
            other: '{{anotherVariable}}',
          },
        },
      ],
    };
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition);

    const result = collectAllVariables(model, yamlDocument, workflowGraph);

    expect(result).toHaveLength(2);
    expect(result[0].key).toBe('myVariable');
    expect(result[0].type).toBe('regexp');
    expect(result[1].key).toBe('anotherVariable');
    expect(result[1].type).toBe('regexp');
  });

  it('should collect foreach variables', () => {
    const yaml = `name: Test Workflow
steps:
  - name: Foreach Step
    foreach: {{items}}
    type: foreach
    steps:
      - name: Inner Step
        action: test`;

    const model = createMockModel(yaml);
    const yamlDocument = parseDocument(yaml);
    const workflowDefinition: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'Foreach Step',
          type: 'foreach',
          foreach: '{{items}}',
          steps: [
            {
              name: 'Inner Step',
              type: 'test.action',
            },
          ],
        },
      ],
    };
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition);

    const result = collectAllVariables(model, yamlDocument, workflowGraph);

    const foreachVariables = result.filter((v) => v.type === 'foreach');
    // With the proper foreach step structure, the function should detect the foreach variable
    expect(foreachVariables).toHaveLength(1);
    expect(foreachVariables[0].key).toBe('items');
  });

  it('should handle complex variable paths', () => {
    const yaml = `name: Test Workflow
steps:
  - name: Test Step
    action: test
    params:
      value: "{{response.data.items[0].name}}"`;

    const model = createMockModel(yaml);
    const yamlDocument = parseDocument(yaml);
    const workflowDefinition: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'Test Step',
          type: 'test.action',
          with: {
            value: '{{response.data.items[0].name}}',
          },
        },
      ],
    };
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition);

    const result = collectAllVariables(model, yamlDocument, workflowGraph);

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('response.data.items[0].name');
  });

  it('should handle empty variables', () => {
    const yaml = `name: Test Workflow
steps:
  - name: Test Step
    action: test
    params:
      valid: "{{validVar}}"`;

    const model = createMockModel(yaml);
    const yamlDocument = parseDocument(yaml);
    const workflowDefinition: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'Test Step',
          type: 'test.action',
          with: {
            valid: '{{validVar}}',
          },
        },
      ],
    };
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition);

    const result = collectAllVariables(model, yamlDocument, workflowGraph);

    // The regex pattern VARIABLE_REGEX_GLOBAL requires at least one character in the key
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('validVar');
  });

  it('should calculate correct positions for variables', () => {
    const yaml = `name: Test Workflow
steps:
  - name: Test Step
    action: test
    params:
      value: "{{myVar}}"`;

    const model = createMockModel(yaml);
    const yamlDocument = parseDocument(yaml);
    const workflowDefinition: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'Test Step',
          type: 'test.action',
          with: {
            value: '{{myVar}}',
          },
        },
      ],
    };
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition);

    const result = collectAllVariables(model, yamlDocument, workflowGraph);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      key: 'myVar',
      startLineNumber: 6,
      startColumn: 15,
      endLineNumber: 6,
      endColumn: 24,
    });
  });

  it('should handle multiple variables in same line', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: Test Step
    action: test
    params:
      value: "{{var1}} and {{var2}} and {{var3}}"
`;

    const model = createMockModel(yaml);
    const yamlDocument = parseDocument(yaml);
    const workflowDefinition: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'Test Step',
          type: 'test.action',
          with: {
            value: '{{var1}} and {{var2}} and {{var3}}',
          },
        },
      ],
    };
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition);

    const result = collectAllVariables(model, yamlDocument, workflowGraph);

    expect(result).toHaveLength(3);
    expect(result.map((v) => v.key)).toEqual(['var1', 'var2', 'var3']);
    expect(result.every((v) => v.type === 'regexp')).toBe(true);
  });

  it('should handle variables in conditional expressions', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: Conditional Step
    if:
      eq:
        - "{{status}}"
        - "active"
    then:
      - name: Then Step
        action: test
        params:
          value: "{{thenVar}}"
`;

    const model = createMockModel(yaml);
    const yamlDocument = parseDocument(yaml);
    const workflowDefinition: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'Conditional Step',
          type: 'if',
          condition: 'eq',
          steps: [
            {
              name: 'Then Step',
              type: 'test.action',
            },
          ],
        },
      ],
    };
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition);

    const result = collectAllVariables(model, yamlDocument, workflowGraph);

    expect(result).toHaveLength(2);
    expect(result.map((v) => v.key)).toContain('status');
    expect(result.map((v) => v.key)).toContain('thenVar');
  });

  it('should generate unique IDs for variables', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: Test Step
    action: test
    params:
      value1: "{{myVar}}"
      value2: "{{myVar}}"
`;

    const model = createMockModel(yaml);
    const yamlDocument = parseDocument(yaml);
    const workflowDefinition: WorkflowYaml = {
      name: 'Test Workflow',
      version: '1',
      enabled: true,
      triggers: [{ type: 'manual' }],
      steps: [
        {
          name: 'Test Step',
          type: 'test.action',
          with: {
            value1: '{{myVar}}',
            value2: '{{myVar}}',
          },
        },
      ],
    };
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition);

    const result = collectAllVariables(model, yamlDocument, workflowGraph);

    expect(result).toHaveLength(2);
    expect(result[0].id).not.toBe(result[1].id);
    expect(result[0].key).toBe('myVar');
    expect(result[1].key).toBe('myVar');
  });
});
