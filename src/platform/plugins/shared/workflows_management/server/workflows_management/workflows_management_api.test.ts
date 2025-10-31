/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { transformWorkflowYamlJsontoEsWorkflow } from '@kbn/workflows';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { WorkflowsManagementApi } from './workflows_management_api';
import type { WorkflowsService } from './workflows_management_service';
import { WorkflowValidationError } from '../../common/lib/errors';
import { validateStepNameUniqueness } from '../../common/lib/validate_step_names';
import { parseWorkflowYamlToJSON } from '../../common/lib/yaml_utils';

// Mock dependencies
jest.mock('../../common/lib/yaml_utils');
jest.mock('../../common/lib/validate_step_names');
jest.mock('@kbn/workflows');

const mockParseWorkflowYamlToJSON = parseWorkflowYamlToJSON as jest.Mock;
const mockValidateStepNameUniqueness = validateStepNameUniqueness as jest.Mock;
const mockTransformWorkflowYamlJsontoEsWorkflow =
  transformWorkflowYamlJsontoEsWorkflow as jest.Mock;

describe('WorkflowsManagementApi', () => {
  let underTest: WorkflowsManagementApi;
  let mockWorkflowsService: jest.Mocked<WorkflowsService>;
  let mockGetWorkflowsExecutionEngine: jest.Mock;
  let mockWorkflowsExecutionEngine: jest.Mocked<WorkflowsExecutionEnginePluginStart>;
  let mockRequest: KibanaRequest;

  const mockWorkflowYaml = `name: Test Workflow
enabled: true
trigger:
  schedule:
    cron: "0 0 * * *"
steps:
  - name: step1
    action: test
    config: {}`;

  const mockParsedYaml = {
    name: 'Test Workflow',
    enabled: true,
    trigger: {
      schedule: {
        cron: '0 0 * * *',
      },
    },
    steps: [
      {
        name: 'step1',
        type: 'test',
      },
    ],
  };

  const mockTransformedWorkflow = {
    name: 'Test Workflow',
    enabled: true,
    definition: {
      name: 'Test Workflow',
      enabled: true,
      version: '1' as const,
      triggers: [
        {
          type: 'scheduled' as const,
          with: {
            every: '0 0 * * *',
          },
        },
      ],
      steps: [
        {
          name: 'step1',
          type: 'test',
        },
      ],
    },
  };

  const mockWorkflowDetailDto: WorkflowDetailDto = {
    id: 'existing-workflow-id',
    name: 'Existing Workflow',
    yaml: mockWorkflowYaml,
    enabled: true,
    definition: {
      name: 'Existing Workflow',
      enabled: true,
      version: '1',
      triggers: [
        {
          type: 'scheduled',
          with: {
            every: '0 0 * * *',
          },
        },
      ],
      steps: [
        {
          name: 'step1',
          type: 'test',
        },
      ],
    },
    createdBy: 'test-user',
    lastUpdatedBy: 'test-user',
    valid: true,
    createdAt: '2023-01-01T00:00:00.000Z',
    lastUpdatedAt: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockWorkflowsService = jest.mocked<WorkflowsService>({} as any);
    mockWorkflowsService.getWorkflow = jest.fn();
    mockWorkflowsService.getWorkflowZodSchema = jest.fn();
    mockWorkflowsExecutionEngine = jest.mocked<WorkflowsExecutionEnginePluginStart>({} as any);
    mockWorkflowsExecutionEngine.executeWorkflow = jest.fn();

    mockGetWorkflowsExecutionEngine = jest.fn().mockResolvedValue(mockWorkflowsExecutionEngine);

    mockRequest = {
      auth: {
        credentials: {
          username: 'test-user',
        },
      },
    } as any;

    underTest = new WorkflowsManagementApi(mockWorkflowsService, mockGetWorkflowsExecutionEngine);

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockWorkflowsService.getWorkflowZodSchema.mockResolvedValue({} as any);
    mockWorkflowsExecutionEngine.executeWorkflow.mockResolvedValue({
      workflowExecutionId: 'test-execution-id',
    } as any);

    mockParseWorkflowYamlToJSON.mockReturnValue({
      data: mockParsedYaml,
      error: null,
    });

    mockTransformWorkflowYamlJsontoEsWorkflow.mockReturnValue(mockTransformedWorkflow);

    mockValidateStepNameUniqueness.mockReturnValue({
      isValid: true,
      errors: [],
    });
  });

  describe('testWorkflow', () => {
    const spaceId = 'default';
    const inputs = {
      event: { type: 'test-event' },
      param1: 'value1',
    };

    describe('when testing with workflowYaml parameter', () => {
      it('should successfully test workflow with valid YAML', async () => {
        const result = await underTest.testWorkflow({
          workflowYaml: mockWorkflowYaml,
          inputs,
          spaceId,
          request: mockRequest,
        });

        expect(result).toBe('test-execution-id');
        expect(mockWorkflowsService.getWorkflowZodSchema).toHaveBeenCalledWith(
          { loose: true },
          spaceId,
          mockRequest
        );
        expect(mockParseWorkflowYamlToJSON).toHaveBeenCalledWith(mockWorkflowYaml, {});
        expect(mockTransformWorkflowYamlJsontoEsWorkflow).toHaveBeenCalledWith(mockParsedYaml);
        expect(mockWorkflowsExecutionEngine.executeWorkflow).toHaveBeenCalledWith(
          {
            id: 'test-workflow',
            name: 'Test Workflow',
            enabled: true,
            definition: mockTransformedWorkflow.definition,
            yaml: mockWorkflowYaml,
            isTestRun: true,
          },
          {
            event: { type: 'test-event' },
            spaceId,
            inputs: { param1: 'value1' },
          },
          mockRequest
        );
      });

    //   it('should use provided workflowId when both workflowYaml and workflowId are provided', async () => {
    //     const result = await api.testWorkflow({
    //       workflowId: 'custom-workflow-id',
    //       workflowYaml: mockWorkflowYaml,
    //       inputs,
    //       spaceId,
    //       request: mockRequest,
    //     });

    //     expect(result).toBe('test-execution-id');
    //     expect(mockWorkflowsExecutionEngine.executeWorkflow).toHaveBeenCalledWith(
    //       expect.objectContaining({
    //         id: 'custom-workflow-id',
    //       }),
    //       expect.any(Object),
    //       mockRequest
    //     );
    //   });

      it('should throw error when YAML parsing fails', async () => {
        const parseError = new Error('Invalid YAML syntax');
        mockParseWorkflowYamlToJSON.mockReturnValue({
          data: null,
          error: parseError,
        });

        await expect(
          underTest.testWorkflow({
            workflowYaml: 'invalid: yaml: content',
            inputs,
            spaceId,
            request: mockRequest,
          })
        ).rejects.toThrow('Invalid YAML syntax');

        expect(mockWorkflowsExecutionEngine.executeWorkflow).not.toHaveBeenCalled();
      });

      it('should throw WorkflowValidationError when step names are not unique', async () => {
        mockValidateStepNameUniqueness.mockReturnValue({
          isValid: false,
          errors: [{ message: 'Duplicate step name: step1' }],
        });

        await expect(
          underTest.testWorkflow({
            workflowYaml: mockWorkflowYaml,
            inputs,
            spaceId,
            request: mockRequest,
          })
        ).rejects.toThrow(WorkflowValidationError);

        await expect(
          underTest.testWorkflow({
            workflowYaml: mockWorkflowYaml,
            inputs,
            spaceId,
            request: mockRequest,
          })
        ).rejects.toThrow(
          'Workflow validation failed: Step names must be unique throughout the workflow.'
        );

        expect(mockWorkflowsExecutionEngine.executeWorkflow).not.toHaveBeenCalled();
      });

      it('should separate event from manual inputs when executing workflow', async () => {
        const complexInputs = {
          event: { type: 'test-event', data: { foo: 'bar' } },
          param1: 'value1',
          param2: 'value2',
        };

        await underTest.testWorkflow({
          workflowYaml: mockWorkflowYaml,
          inputs: complexInputs,
          spaceId,
          request: mockRequest,
        });

        expect(mockWorkflowsExecutionEngine.executeWorkflow).toHaveBeenCalledWith(
          expect.any(Object),
          {
            event: { type: 'test-event', data: { foo: 'bar' } },
            spaceId,
            inputs: {
              param1: 'value1',
              param2: 'value2',
            },
          },
          mockRequest
        );
      });
    });

    describe('when testing with workflowId parameter', () => {
      it('should fetch workflow YAML by ID and execute it', async () => {
        mockWorkflowsService.getWorkflow.mockResolvedValue(mockWorkflowDetailDto);

        const result = await underTest.testWorkflow({
          workflowId: 'existing-workflow-id',
          inputs,
          spaceId,
          request: mockRequest,
        });

        expect(result).toBe('test-execution-id');
        expect(mockWorkflowsService.getWorkflow).toHaveBeenCalledWith(
          'existing-workflow-id',
          spaceId
        );
        expect(mockParseWorkflowYamlToJSON).toHaveBeenCalledWith(mockWorkflowYaml, {});
        expect(mockWorkflowsExecutionEngine.executeWorkflow).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'existing-workflow-id',
            yaml: mockWorkflowYaml,
          }),
          expect.any(Object),
          mockRequest
        );
      });

      it('should throw WorkflowNotFoundError when workflow does not exist', async () => {
        mockWorkflowsService.getWorkflow.mockResolvedValue(null);

        await expect(
          underTest.testWorkflow({
            workflowId: 'non-existent-workflow-id',
            inputs,
            spaceId,
            request: mockRequest,
          })
        ).rejects.toThrow(WorkflowNotFoundError);

        expect(mockWorkflowsService.getWorkflow).toHaveBeenCalledWith(
          'non-existent-workflow-id',
          spaceId
        );
        expect(mockWorkflowsExecutionEngine.executeWorkflow).not.toHaveBeenCalled();
      });

      it('should validate fetched workflow YAML', async () => {
        mockWorkflowsService.getWorkflow.mockResolvedValue(mockWorkflowDetailDto);

        const parseError = new Error('Invalid YAML in stored workflow');
        mockParseWorkflowYamlToJSON.mockReturnValue({
          data: null,
          error: parseError,
        });

        await expect(
          underTest.testWorkflow({
            workflowId: 'existing-workflow-id',
            inputs,
            spaceId,
            request: mockRequest,
          })
        ).rejects.toThrow('Invalid YAML in stored workflow');

        expect(mockWorkflowsExecutionEngine.executeWorkflow).not.toHaveBeenCalled();
      });

    //   it('should prefer workflowYaml over workflowId when both are provided', async () => {
    //     const differentYaml = 'name: Different Workflow\nenabled: true';

    //     await api.testWorkflow({
    //       workflowId: 'existing-workflow-id',
    //       workflowYaml: differentYaml,
    //       inputs,
    //       spaceId,
    //       request: mockRequest,
    //     });

    //     // Should not fetch workflow when YAML is provided
    //     expect(mockWorkflowsService.getWorkflow).not.toHaveBeenCalled();
    //     expect(mockParseWorkflowYamlToJSON).toHaveBeenCalledWith(differentYaml, {});
    //     expect(mockWorkflowsExecutionEngine.executeWorkflow).toHaveBeenCalledWith(
    //       expect.objectContaining({
    //         yaml: differentYaml,
    //         id: 'existing-workflow-id',
    //       }),
    //       expect.any(Object),
    //       mockRequest
    //     );
    //   });
    });

    describe('when missing required parameters', () => {
      it('should throw error when neither workflowId nor workflowYaml is provided', async () => {
        await expect(
          underTest.testWorkflow({
            inputs,
            spaceId,
            request: mockRequest,
          })
        ).rejects.toThrow('Either workflowId or workflowYaml must be provided');

        expect(mockWorkflowsExecutionEngine.executeWorkflow).not.toHaveBeenCalled();
      });

      it('should handle empty workflowYaml as missing parameter', async () => {
        await expect(
          underTest.testWorkflow({
            workflowYaml: '',
            inputs,
            spaceId,
            request: mockRequest,
          })
        ).rejects.toThrow('Either workflowId or workflowYaml must be provided');
      });
    });

    describe('workflow execution configuration', () => {
      it('should set isTestRun flag to true', async () => {
        await underTest.testWorkflow({
          workflowYaml: mockWorkflowYaml,
          inputs,
          spaceId,
          request: mockRequest,
        });

        expect(mockWorkflowsExecutionEngine.executeWorkflow).toHaveBeenCalledWith(
          expect.objectContaining({
            isTestRun: true,
          }),
          expect.any(Object),
          mockRequest
        );
      });

      it('should pass spaceId in execution context', async () => {
        const customSpaceId = 'custom-space';

        await underTest.testWorkflow({
          workflowYaml: mockWorkflowYaml,
          inputs,
          spaceId: customSpaceId,
          request: mockRequest,
        });

        expect(mockWorkflowsExecutionEngine.executeWorkflow).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            spaceId: customSpaceId,
          }),
          mockRequest
        );
      });

      it('should pass request object to execution engine', async () => {
        await underTest.testWorkflow({
          workflowYaml: mockWorkflowYaml,
          inputs,
          spaceId,
          request: mockRequest,
        });

        expect(mockWorkflowsExecutionEngine.executeWorkflow).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          mockRequest
        );
      });

      it('should use loose schema validation mode', async () => {
        await underTest.testWorkflow({
          workflowYaml: mockWorkflowYaml,
          inputs,
          spaceId,
          request: mockRequest,
        });

        expect(mockWorkflowsService.getWorkflowZodSchema).toHaveBeenCalledWith(
          { loose: true },
          spaceId,
          mockRequest
        );
      });

      it('should validate step name uniqueness', async () => {
        await underTest.testWorkflow({
          workflowYaml: mockWorkflowYaml,
          inputs,
          spaceId,
          request: mockRequest,
        });

        expect(mockValidateStepNameUniqueness).toHaveBeenCalledWith(mockParsedYaml);
      });
    });
  });
});
