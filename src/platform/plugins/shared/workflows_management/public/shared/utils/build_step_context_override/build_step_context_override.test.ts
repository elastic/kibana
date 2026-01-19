/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowGraph } from '@kbn/workflows/graph';
import { buildContextOverride } from './build_step_context_override';

describe('buildContextOverride', () => {
  const mockStaticData = {
    workflow: {
      id: 'test-workflow-id',
      name: 'test-workflow',
      enabled: true,
      spaceId: 'default',
    },
    consts: {},
  };

  describe('with simple workflow', () => {
    it('should return empty context when no inputs are found in graph', () => {
      const simpleWorkflow = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'simple_step',
            type: 'console.log',
            with: {
              message: 'Hello, world!',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(simpleWorkflow);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({});
      expect(result.schema).toBeDefined();
    });

    it('should build context for step references', () => {
      const workflowWithStepReferences = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'first_step',
            type: 'console.log',
            with: {
              message: 'Hello',
            },
          },
          {
            name: 'second_step',
            type: 'console.log',
            with: {
              message: '{{ steps.first_step.output.result }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithStepReferences);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          first_step: {
            output: {
              result: 'replace with your data',
            },
          },
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should build context for nested step output references', () => {
      const workflowWithNestedReferences = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'data_step',
            type: 'data.processor',
            with: {
              query: 'SELECT * FROM table',
            },
          },
          {
            name: 'process_step',
            type: 'console.log',
            with: {
              message: '{{ steps.data_step.output.data.rows[0].name }}',
              count: '{{ steps.data_step.output.meta.total }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithNestedReferences);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          data_step: {
            output: {
              data: {
                rows: {
                  '0': {
                    name: 'replace with your data',
                  },
                },
              },
              meta: {
                total: 'replace with your data',
              },
            },
          },
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should build context for foreach references', () => {
      const workflowWithForeach = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'foreach_step',
            type: 'foreach',
            foreach: '{{ steps.data_step.output.items }}',
            steps: [
              {
                name: 'process_item',
                type: 'console.log',
                with: {
                  message: '{{ foreach.item.name }}',
                  index: '{{ foreach.index }}',
                  total: '{{ foreach.total }}',
                },
              },
            ],
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithForeach);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      // The foreach step should extract inputs from the template expression
      expect(result.stepContext).toEqual({
        steps: {
          data_step: {
            output: {
              items: 'replace with your data',
            },
          },
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should build context for foreach variables when used in non-foreach steps', () => {
      const workflowWithForeachUsage = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'simple_step',
            type: 'console.log',
            with: {
              message: '{{ foreach.item.name }}',
              index: '{{ foreach.index }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithForeachUsage);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        foreach: {
          item: {
            name: 'replace with your data',
          },
          index: 'replace with your data',
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should build context for workflow execution references', () => {
      const workflowWithExecutionRefs = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'execution_step',
            type: 'console.log',
            with: {
              workflowId: '{{ execution.workflow.id }}',
              executionId: '{{ execution.id }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithExecutionRefs);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        execution: {
          workflow: {
            id: 'replace with your data',
          },
          id: 'replace with your data',
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should build context for mixed references', () => {
      const workflowWithMixedRefs = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'mixed_step',
            type: 'console.log',
            with: {
              stepOutput: '{{ steps.previous_step.output.data }}',
              workflowName: '{{ workflow.name }}',
              eventData: '{{ event.payload.user.id }}',
              inputValue: '{{ inputs.userInput }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithMixedRefs);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          previous_step: {
            output: {
              data: 'replace with your data',
            },
          },
        },
        workflow: {
          name: 'test-workflow',
        },
        event: {
          payload: {
            user: {
              id: 'replace with your data',
            },
          },
        },
        inputs: {
          userInput: 'replace with your data',
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should use input default values when inputsDefinition is provided', () => {
      const workflowWithInputs = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'log_input',
            type: 'console.log',
            with: {
              message: '{{ inputs.message }}',
              count: '{{ inputs.count }}',
              flag: '{{ inputs.flag }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithInputs);
      const staticDataWithInputs = {
        ...mockStaticData,
        inputsDefinition: [
          { name: 'message', type: 'string' as const, default: 'hello world' },
          { name: 'count', type: 'number' as const, default: 42 },
          { name: 'flag', type: 'boolean' as const, default: true },
        ],
      };
      const result = buildContextOverride(workflowGraph, staticDataWithInputs);

      expect(result.stepContext).toEqual({
        inputs: {
          message: 'hello world',
          count: 42,
          flag: true,
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should fall back to placeholder for inputs without defaults', () => {
      const workflowWithInputs = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'log_input',
            type: 'console.log',
            with: {
              messageWithDefault: '{{ inputs.messageWithDefault }}',
              messageWithoutDefault: '{{ inputs.messageWithoutDefault }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithInputs);
      const staticDataWithInputs = {
        ...mockStaticData,
        inputsDefinition: [
          { name: 'messageWithDefault', type: 'string' as const, default: 'default value' },
          { name: 'messageWithoutDefault', type: 'string' as const },
        ],
      };
      const result = buildContextOverride(workflowGraph, staticDataWithInputs);

      expect(result.stepContext).toEqual({
        inputs: {
          messageWithDefault: 'default value',
          messageWithoutDefault: 'replace with your data',
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should handle array input defaults', () => {
      const workflowWithArrayInput = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'log_input',
            type: 'console.log',
            with: {
              tags: '{{ inputs.tags }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithArrayInput);
      const staticDataWithInputs = {
        ...mockStaticData,
        inputsDefinition: [
          { name: 'tags', type: 'array' as const, default: ['tag1', 'tag2', 'tag3'] },
        ],
      };
      const result = buildContextOverride(workflowGraph, staticDataWithInputs);

      expect(result.stepContext).toEqual({
        inputs: {
          tags: ['tag1', 'tag2', 'tag3'],
        },
      });
      expect(result.schema).toBeDefined();
    });

    it('should handle choice input defaults', () => {
      const workflowWithChoiceInput = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'log_input',
            type: 'console.log',
            with: {
              priority: '{{ inputs.priority }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithChoiceInput);
      const staticDataWithInputs = {
        ...mockStaticData,
        inputsDefinition: [
          {
            name: 'priority',
            type: 'choice' as const,
            options: ['low', 'medium', 'high'],
            default: 'medium',
          },
        ],
      };
      const result = buildContextOverride(workflowGraph, staticDataWithInputs);

      expect(result.stepContext).toEqual({
        inputs: {
          priority: 'medium',
        },
      });
      expect(result.schema).toBeDefined();
    });
  });

  describe('schema generation', () => {
    it('should generate a valid zod schema that validates the mock data', () => {
      const workflow = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'test_step',
            type: 'console.log',
            with: {
              message: '{{ steps.previous.output.result }}',
              count: '{{ workflow.id }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflow);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      // The schema should successfully parse the mock data
      expect(() => result.schema.parse(result.stepContext)).not.toThrow();
    });

    it('should generate schema for array structures', () => {
      const workflow = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'array_step',
            type: 'console.log',
            with: {
              firstItem: '{{ steps.data.output.items[0].name }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflow);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          data: {
            output: {
              items: {
                '0': {
                  name: 'replace with your data',
                },
              },
            },
          },
        },
      });

      // Verify the schema accepts the mock data
      expect(() => result.schema.parse(result.stepContext)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty workflow gracefully', () => {
      const emptyWorkflow = {
        version: '1' as const,
        name: 'empty-workflow',
        enabled: true,
        triggers: [],
        steps: [],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(emptyWorkflow);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({});
      expect(result.schema).toBeDefined();
      expect(() => result.schema.parse(result.stepContext)).not.toThrow();
    });

    it('should handle duplicate step references', () => {
      const workflowWithDuplicates = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'duplicate_refs',
            type: 'console.log',
            with: {
              message1: '{{ steps.source.output.data }}',
              message2: '{{ steps.source.output.data }}',
              message3: '{{ steps.source.output.meta }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithDuplicates);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          source: {
            output: {
              data: 'replace with your data',
              meta: 'replace with your data',
            },
          },
        },
      });
    });

    it('should handle deeply nested property paths', () => {
      const workflowWithDeepNesting = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'deep_step',
            type: 'console.log',
            with: {
              value: '{{ steps.api.output.response.data.user.profile.settings.theme }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithDeepNesting);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          api: {
            output: {
              response: {
                data: {
                  user: {
                    profile: {
                      settings: {
                        theme: 'replace with your data',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should handle multiple array indices', () => {
      const workflowWithMultipleArrays = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'array_step',
            type: 'console.log',
            with: {
              value1: '{{ steps.data.output.matrix[0][1].value }}',
              value2: '{{ steps.data.output.list[5].name }}',
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithMultipleArrays);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          data: {
            output: {
              matrix: {
                '0': {
                  '1': {
                    value: 'replace with your data',
                  },
                },
              },
              list: {
                '5': {
                  name: 'replace with your data',
                },
              },
            },
          },
        },
      });
    });

    it('should handle complex property access with mixed notation', () => {
      const workflowWithMixedNotation = {
        version: '1' as const,
        name: 'test-workflow',
        enabled: true,
        triggers: [
          {
            type: 'manual' as const,
            enabled: true,
          },
        ],
        steps: [
          {
            name: 'mixed_notation_step',
            type: 'console.log',
            with: {
              value: "{{ steps.api.output.data['user-info'][0].profile.name }}",
            },
          },
        ],
      };

      const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowWithMixedNotation);
      const result = buildContextOverride(workflowGraph, mockStaticData);

      expect(result.stepContext).toEqual({
        steps: {
          api: {
            output: {
              data: {
                'user-info': {
                  '0': {
                    profile: {
                      name: 'replace with your data',
                    },
                  },
                },
              },
            },
          },
        },
      });
    });
  });
});
