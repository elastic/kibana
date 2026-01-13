/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Document, Scalar, YAMLMap } from 'yaml';
import { monaco } from '@kbn/monaco';
import type { WorkflowInput } from '@kbn/workflows';
import { getWorkflowInputsSuggestions } from './get_workflow_inputs_suggestions';
import type { AutocompleteContext } from '../../context/autocomplete.types';

describe('getWorkflowInputsSuggestions', () => {
  const createMockContext = (overrides: Partial<AutocompleteContext> = {}): AutocompleteContext => {
    const defaultWorkflowInputs: WorkflowInput[] = [
      {
        name: 'name',
        type: 'string',
        required: true,
        description: 'The name of the item',
      },
      {
        name: 'count',
        type: 'number',
        required: false,
        default: 0,
      },
      {
        name: 'enabled',
        type: 'boolean',
        required: true,
      },
    ];

    return {
      triggerCharacter: null,
      triggerKind: null,
      line: '',
      lineUpToCursor: '',
      lineParseResult: {
        matchType: 'workflow-inputs',
        fullKey: '',
        match: null,
      },
      path: [],
      range: {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      },
      absoluteOffset: 0,
      focusedStepInfo: {
        stepType: 'workflow.execute',
        stepId: 'test-step',
        stepYamlNode: new YAMLMap(),
        lineStart: 1,
        lineEnd: 10,
        propInfos: {
          'workflow-id': {
            path: ['workflow-id'],
            valueNode: new Scalar('workflow-123'),
            keyNode: new Scalar('workflow-id'),
          },
        },
      },
      focusedYamlPair: null,
      contextSchema: {} as any,
      contextScopedToPath: null,
      yamlDocument: new Document(),
      scalarType: null,
      isInLiquidBlock: false,
      isInTriggersContext: false,
      isInScheduledTriggerWithBlock: false,
      isInStepsContext: true,
      dynamicConnectorTypes: null,
      workflows: {
        workflows: {
          'workflow-123': {
            id: 'workflow-123',
            name: 'Test Workflow',
            inputs: defaultWorkflowInputs,
          },
        },
        totalWorkflows: 1,
      },
      workflowDefinition: null,
      ...overrides,
    };
  };

  describe('when not in workflow.execute or workflow.executeAsync step', () => {
    it('should return empty array for other step types or null focusedStepInfo', async () => {
      const context1 = createMockContext({
        focusedStepInfo: {
          stepType: 'console',
          stepId: 'test-step',
          stepYamlNode: new YAMLMap(),
          lineStart: 1,
          lineEnd: 10,
          propInfos: {},
        },
      });
      const context2 = createMockContext({
        focusedStepInfo: null,
      });

      expect(await getWorkflowInputsSuggestions(context1)).toHaveLength(0);
      expect(await getWorkflowInputsSuggestions(context2)).toHaveLength(0);
    });
  });

  describe('when matchType is not workflow-inputs', () => {
    it('should return empty array', async () => {
      const context = createMockContext({
        lineParseResult: {
          matchType: 'type',
          fullKey: '',
          match: {} as RegExpMatchArray,
          valueStartIndex: 0,
        },
      });

      const result = await getWorkflowInputsSuggestions(context);
      expect(result).toHaveLength(0);
    });
  });

  describe('when workflow-id is missing or invalid', () => {
    it('should return empty array when workflow-id is missing, not a string, or empty', async () => {
      const context1 = createMockContext({
        focusedStepInfo: {
          stepType: 'workflow.execute',
          stepId: 'test-step',
          stepYamlNode: new YAMLMap(),
          lineStart: 1,
          lineEnd: 10,
          propInfos: {},
        },
      });
      const context2 = createMockContext({
        focusedStepInfo: {
          stepType: 'workflow.execute',
          stepId: 'test-step',
          stepYamlNode: new YAMLMap(),
          lineStart: 1,
          lineEnd: 10,
          propInfos: {
            'workflow-id': {
              path: ['workflow-id'],
              valueNode: new Scalar(123),
              keyNode: new Scalar('workflow-id'),
            },
          },
        },
      });
      const context3 = createMockContext({
        focusedStepInfo: {
          stepType: 'workflow.execute',
          stepId: 'test-step',
          stepYamlNode: new YAMLMap(),
          lineStart: 1,
          lineEnd: 10,
          propInfos: {
            'workflow-id': {
              path: ['workflow-id'],
              valueNode: new Scalar(''),
              keyNode: new Scalar('workflow-id'),
            },
          },
        },
      });

      expect(await getWorkflowInputsSuggestions(context1)).toHaveLength(0);
      expect(await getWorkflowInputsSuggestions(context2)).toHaveLength(0);
      expect(await getWorkflowInputsSuggestions(context3)).toHaveLength(0);
    });
  });

  describe('when workflow is not found or has no inputs', () => {
    it('should return empty array when workflow does not exist, has no inputs, or inputs are undefined', async () => {
      const context1 = createMockContext({
        workflows: {
          workflows: {},
          totalWorkflows: 0,
        },
      });
      const context2 = createMockContext({
        workflows: {
          workflows: {
            'workflow-123': {
              id: 'workflow-123',
              name: 'Test Workflow',
              inputs: [],
            },
          },
          totalWorkflows: 1,
        },
      });
      const context3 = createMockContext({
        workflows: {
          workflows: {
            'workflow-123': {
              id: 'workflow-123',
              name: 'Test Workflow',
            },
          },
          totalWorkflows: 1,
        },
      });

      expect(await getWorkflowInputsSuggestions(context1)).toHaveLength(0);
      expect(await getWorkflowInputsSuggestions(context2)).toHaveLength(0);
      expect(await getWorkflowInputsSuggestions(context3)).toHaveLength(0);
    });
  });

  describe('when workflow inputs are available', () => {
    it('should return suggestions for all inputs and filter by prefix', async () => {
      const context1 = createMockContext();
      const result1 = await getWorkflowInputsSuggestions(context1);
      expect(result1).toHaveLength(3);
      expect(result1.map((s) => s.label)).toEqual(['name', 'count', 'enabled']); // Order matches workflow.inputs array

      const context2 = createMockContext({
        lineParseResult: {
          matchType: 'workflow-inputs',
          fullKey: 'na',
          match: null,
        },
      });
      const result2 = await getWorkflowInputsSuggestions(context2);
      expect(result2).toHaveLength(1);
      expect(result2[0].label).toBe('name');

      const context3 = createMockContext({
        lineParseResult: {
          matchType: 'workflow-inputs',
          fullKey: 'xyz',
          match: null,
        },
      });
      expect(await getWorkflowInputsSuggestions(context3)).toHaveLength(0);
    });
  });

  describe('suggestion properties', () => {
    it('should create suggestions with correct properties, documentation, defaults, and sorting', async () => {
      const context = createMockContext();
      const result = await getWorkflowInputsSuggestions(context);
      const nameSuggestion = result.find((s) => s.label === 'name');
      const countSuggestion = result.find((s) => s.label === 'count');

      // Basic properties
      expect(nameSuggestion?.kind).toBe(monaco.languages.CompletionItemKind.Property);
      expect(nameSuggestion?.detail).toBe('string (required)');
      expect(nameSuggestion?.sortText).toBe('!name');
      expect(nameSuggestion?.insertText).toContain('name:');

      // Default value
      expect(countSuggestion?.insertText).toContain('count: 0');

      // Documentation
      const doc = nameSuggestion?.documentation as { value: string };
      expect(doc.value).toContain('Input: name');
      expect(doc.value).toContain('Type: string');
      expect(doc.value).toContain('Required: Yes');
      expect(doc.value).toContain('Description: The name of the item');

      // Sorting (required first - name and enabled are required, count is not)
      const nameSort = result.find((s) => s.label === 'name')?.sortText;
      const enabledSort = result.find((s) => s.label === 'enabled')?.sortText;
      const countSort = result.find((s) => s.label === 'count')?.sortText;
      expect(nameSort).toMatch(/^!/);
      expect(enabledSort).toMatch(/^!/);
      expect(countSort).not.toMatch(/^!/);
    });
  });

  describe('for workflow.executeAsync step and input type-specific insertText', () => {
    it('should return suggestions for workflow.executeAsync step', async () => {
      const context = createMockContext({
        focusedStepInfo: {
          stepType: 'workflow.executeAsync',
          stepId: 'test-step',
          stepYamlNode: new YAMLMap(),
          lineStart: 1,
          lineEnd: 10,
          propInfos: {
            'workflow-id': {
              path: ['workflow-id'],
              valueNode: new Scalar('workflow-123'),
              keyNode: new Scalar('workflow-id'),
            },
          },
        },
      });

      expect(await getWorkflowInputsSuggestions(context)).toHaveLength(3);
    });

    it('should create correct insertText for different input types', async () => {
      const testCases = [
        { type: 'string', name: 'message', expected: 'message: ""' },
        { type: 'number', name: 'count', expected: 'count: 0' },
        { type: 'boolean', name: 'enabled', expected: 'enabled: false' },
        {
          type: 'choice',
          name: 'status',
          expected: 'status: "active"',
          options: ['active', 'inactive', 'pending'],
        },
        { type: 'array', name: 'items', expected: 'items: []' },
      ];

      for (const testCase of testCases) {
        const context = createMockContext({
          workflows: {
            workflows: {
              'workflow-123': {
                id: 'workflow-123',
                name: 'Test Workflow',
                inputs: [
                  {
                    name: testCase.name,
                    type: testCase.type as any,
                    required: false,
                    ...(testCase.options && { options: testCase.options }),
                  },
                ],
              },
            },
            totalWorkflows: 1,
          },
        });

        const result = await getWorkflowInputsSuggestions(context);
        expect(result[0].insertText).toBe(testCase.expected);
      }
    });
  });
});
