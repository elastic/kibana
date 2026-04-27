/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { type WorkflowDetailDto } from '@kbn/workflows';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { z } from '@kbn/zod/v4';
import { type SmlIndexAttachmentFn, WorkflowsManagementApi } from './workflows_management_api';
import type { WorkflowsService } from './workflows_management_service';
import { WORKFLOW_SML_TYPE } from '../../common/agent_builder/constants';

describe('WorkflowsManagementApi', () => {
  let api: WorkflowsManagementApi;
  let mockWorkflowsService: jest.Mocked<WorkflowsService>;
  let mockGetWorkflowsExecutionEngine: jest.Mock;
  let mockRequest: KibanaRequest;

  beforeEach(() => {
    mockWorkflowsService = {
      getWorkflow: jest.fn(),
      getWorkflowZodSchema: jest.fn(),
      createWorkflow: jest.fn(),
      updateWorkflow: jest.fn(),
      deleteWorkflows: jest.fn(),
      bulkCreateWorkflows: jest.fn(),
      validateWorkflow: jest.fn(),
    } as any;

    mockGetWorkflowsExecutionEngine = jest.fn();

    api = new WorkflowsManagementApi(mockWorkflowsService, mockGetWorkflowsExecutionEngine);
    const mockZodSchema = createMockZodSchema();
    mockWorkflowsService.getWorkflowZodSchema.mockResolvedValue(mockZodSchema);

    mockRequest = httpServerMock.createKibanaRequest();
  });

  const createMockZodSchema = () => {
    return z.object({
      name: z.string(),
      description: z.string().optional(),
      enabled: z.boolean().optional(),
      steps: z.array(z.any()).optional(),
    });
  };

  describe('cloneWorkflow', () => {
    const createMockWorkflow = (overrides: Partial<WorkflowDetailDto> = {}): WorkflowDetailDto => ({
      id: 'workflow-123',
      name: 'Original Workflow',
      description: 'A workflow to be cloned',
      enabled: true,
      yaml: 'name: Original Workflow\ndescription: A workflow to be cloned\nenabled: true',
      valid: true,
      createdAt: '2024-01-15T10:00:00.000Z',
      createdBy: 'user@example.com',
      lastUpdatedAt: '2024-01-15T10:30:00.000Z',
      lastUpdatedBy: 'user@example.com',
      definition: null,
      ...overrides,
    });

    it('should clone workflow successfully with updated name', async () => {
      const originalWorkflow = createMockWorkflow();
      const clonedWorkflow: WorkflowDetailDto = {
        ...originalWorkflow,
        id: 'workflow-clone-456',
        name: 'Original Workflow Copy',
        yaml: 'name: Original Workflow Copy\ndescription: A workflow to be cloned\nenabled: true',
        definition: null,
      };

      mockWorkflowsService.createWorkflow.mockResolvedValue(clonedWorkflow);

      const result = await api.cloneWorkflow(originalWorkflow, 'default', mockRequest);

      expect(mockWorkflowsService.getWorkflowZodSchema).toHaveBeenCalledWith(
        { loose: false },
        'default',
        mockRequest
      );
      expect(mockWorkflowsService.createWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          yaml: expect.stringContaining('name: Original Workflow Copy'),
        }),
        'default',
        mockRequest
      );
      expect(result.name).toBe('Original Workflow Copy');
      expect(result.id).toBe('workflow-clone-456');
    });

    it('should not create duplicate name keys in YAML', async () => {
      const originalWorkflow = createMockWorkflow({
        yaml: 'name: Original Workflow\ndescription: A workflow to be cloned\nenabled: true',
      });

      const mockZodSchema = createMockZodSchema();
      mockWorkflowsService.getWorkflowZodSchema.mockResolvedValue(mockZodSchema);

      const clonedWorkflow: WorkflowDetailDto = {
        ...originalWorkflow,
        id: 'workflow-clone-456',
        name: 'Original Workflow Copy',
      };

      mockWorkflowsService.createWorkflow.mockImplementation((command) => {
        // Verify that the YAML doesn't have duplicate name keys
        const yamlString = command.yaml;
        const nameMatches = (yamlString.match(/^name:/gm) || []).length;
        expect(nameMatches).toBe(1);

        return Promise.resolve({
          ...clonedWorkflow,
          yaml: yamlString,
        });
      });

      await api.cloneWorkflow(originalWorkflow, 'default', mockRequest);

      expect(mockWorkflowsService.createWorkflow).toHaveBeenCalled();
      const createCall = mockWorkflowsService.createWorkflow.mock.calls[0];
      const yamlString = createCall[0].yaml;

      // Verify no duplicate name keys
      const lines = yamlString.split('\n');
      const nameLines = lines.filter((line) => line.trim().startsWith('name:'));
      expect(nameLines.length).toBe(1);
      expect(nameLines[0]).toContain('Original Workflow Copy');
    });

    it('should preserve all other workflow properties in cloned YAML', async () => {
      const originalWorkflow = createMockWorkflow({
        yaml: `name: Original Workflow
description: A workflow to be cloned
enabled: true
tags:
  - tag1
  - tag2
steps:
  - id: step1
    name: First Step
    type: action
    action: test-action`,
      });

      const mockZodSchema = z.object({
        name: z.string(),
        description: z.string().optional(),
        enabled: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        steps: z.array(z.any()).optional(),
      });

      mockWorkflowsService.getWorkflowZodSchema.mockResolvedValue(mockZodSchema);

      mockWorkflowsService.createWorkflow.mockImplementation((command) => {
        const yamlString = command.yaml;
        // Verify all properties are preserved
        expect(yamlString).toContain('description: A workflow to be cloned');
        expect(yamlString).toContain('enabled: true');
        expect(yamlString).toContain('tag1');
        expect(yamlString).toContain('tag2');
        expect(yamlString).toContain('step1');
        expect(yamlString).toContain('First Step');
        expect(yamlString).toContain('test-action');
        // Verify name is updated
        expect(yamlString).toContain('name: Original Workflow Copy');
        // Verify no duplicate name
        const nameMatches = (yamlString.match(/^name:/gm) || []).length;
        expect(nameMatches).toBe(1);

        return Promise.resolve({
          ...originalWorkflow,
          id: 'workflow-clone-456',
          name: 'Original Workflow Copy',
          yaml: yamlString,
        });
      });

      await api.cloneWorkflow(originalWorkflow, 'default', mockRequest);

      expect(mockWorkflowsService.createWorkflow).toHaveBeenCalled();
    });

    it('should handle YAML parsing errors gracefully', async () => {
      const originalWorkflow = createMockWorkflow({
        yaml: 'invalid: yaml: content: with: multiple: colons',
      });

      const mockZodSchema = createMockZodSchema();
      mockWorkflowsService.getWorkflowZodSchema.mockResolvedValue(mockZodSchema);

      await expect(api.cloneWorkflow(originalWorkflow, 'default', mockRequest)).rejects.toThrow();

      expect(mockWorkflowsService.getWorkflowZodSchema).toHaveBeenCalled();
      expect(mockWorkflowsService.createWorkflow).not.toHaveBeenCalled();
    });

    it('should handle workflow creation errors', async () => {
      const originalWorkflow = createMockWorkflow();
      const mockZodSchema = createMockZodSchema();
      const creationError = new Error('Failed to create workflow');

      mockWorkflowsService.getWorkflowZodSchema.mockResolvedValue(mockZodSchema);
      mockWorkflowsService.createWorkflow.mockRejectedValue(creationError);

      await expect(api.cloneWorkflow(originalWorkflow, 'default', mockRequest)).rejects.toThrow(
        'Failed to create workflow'
      );

      expect(mockWorkflowsService.getWorkflowZodSchema).toHaveBeenCalled();
      expect(mockWorkflowsService.createWorkflow).toHaveBeenCalled();
    });

    it('should work with different space contexts', async () => {
      const originalWorkflow = createMockWorkflow();
      const mockZodSchema = createMockZodSchema();
      const spaceId = 'custom-space';

      mockWorkflowsService.getWorkflowZodSchema.mockResolvedValue(mockZodSchema);
      mockWorkflowsService.createWorkflow.mockResolvedValue({
        ...originalWorkflow,
        id: 'workflow-clone-789',
        name: 'Original Workflow Copy',
      });

      await api.cloneWorkflow(originalWorkflow, spaceId, mockRequest);

      expect(mockWorkflowsService.getWorkflowZodSchema).toHaveBeenCalledWith(
        { loose: false },
        spaceId,
        mockRequest
      );
      expect(mockWorkflowsService.createWorkflow).toHaveBeenCalledWith(
        expect.any(Object),
        spaceId,
        mockRequest
      );
    });
  });

  describe('testWorkflow', () => {
    let underTest: WorkflowsManagementApi;
    let mockWorkflowsExecutionEngine: jest.Mocked<WorkflowsExecutionEnginePluginStart>;

    const mockWorkflowYaml = `name: Test Workflow
enabled: true
trigger:
  schedule:
    cron: "0 0 * * *"
steps:
  - name: step1
    action: test
    config: {}`;

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

    const parsedMockWorkflow = {
      name: 'Test Workflow',
      enabled: true,
      steps: [
        {
          name: 'step1',
          action: 'test',
          config: {},
        },
      ],
    };

    beforeEach(() => {
      mockWorkflowsExecutionEngine = jest.mocked<WorkflowsExecutionEnginePluginStart>({} as any);
      mockWorkflowsExecutionEngine.executeWorkflow = jest.fn();
      mockWorkflowsExecutionEngine.isEventDrivenExecutionEnabled = jest.fn().mockReturnValue(true);
      mockWorkflowsExecutionEngine.isLogTriggerEventsEnabled = jest.fn().mockReturnValue(true);

      mockGetWorkflowsExecutionEngine = jest.fn().mockResolvedValue(mockWorkflowsExecutionEngine);

      mockRequest = {
        auth: {
          credentials: {
            username: 'test-user',
          },
        },
      } as any;

      underTest = new WorkflowsManagementApi(mockWorkflowsService, mockGetWorkflowsExecutionEngine);

      // Setup default mock implementations
      mockWorkflowsExecutionEngine.executeWorkflow.mockResolvedValue({
        workflowExecutionId: 'test-execution-id',
      } as any);

      mockWorkflowsService.validateWorkflow.mockResolvedValue({
        valid: true,
        diagnostics: [],
        parsedWorkflow: parsedMockWorkflow as any,
      });
    });

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
        expect(mockWorkflowsService.validateWorkflow).toHaveBeenCalledWith(
          mockWorkflowYaml,
          spaceId,
          mockRequest
        );
        expect(mockWorkflowsExecutionEngine.executeWorkflow).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'test-workflow',
            name: 'Test Workflow',
            enabled: true,
            yaml: mockWorkflowYaml,
            isTestRun: true,
          }),
          {
            event: { type: 'test-event' },
            spaceId,
            inputs: { param1: 'value1' },
          },
          mockRequest
        );
      });

      it('should throw error when YAML validation fails', async () => {
        mockWorkflowsService.validateWorkflow.mockResolvedValue({
          valid: false,
          diagnostics: [{ severity: 'error', message: 'Invalid YAML', source: 'schema' }],
        });

        await expect(
          underTest.testWorkflow({
            workflowYaml: 'invalid: yaml: content',
            inputs,
            spaceId,
            request: mockRequest,
          })
        ).rejects.toThrow();

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
        mockWorkflowsService.getWorkflow.mockResolvedValue({
          ...mockWorkflowDetailDto,
          yaml: 'invalid: yaml: content',
        });
        mockWorkflowsService.validateWorkflow.mockResolvedValue({
          valid: false,
          diagnostics: [{ severity: 'error', message: 'Invalid YAML', source: 'schema' }],
        });

        await expect(
          underTest.testWorkflow({
            workflowId: 'existing-workflow-id',
            inputs,
            spaceId,
            request: mockRequest,
          })
        ).rejects.toThrow();

        expect(mockWorkflowsExecutionEngine.executeWorkflow).not.toHaveBeenCalled();
      });
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

      it('should delegate validation to workflowsService.validateWorkflow', async () => {
        await underTest.testWorkflow({
          workflowYaml: mockWorkflowYaml,
          inputs,
          spaceId,
          request: mockRequest,
        });

        expect(mockWorkflowsService.validateWorkflow).toHaveBeenCalledWith(
          mockWorkflowYaml,
          spaceId,
          mockRequest
        );
      });
    });
  });

  describe('validateWorkflow', () => {
    it('should delegate to workflowsService.validateWorkflow', async () => {
      const expectedResult = { valid: true, diagnostics: [] };
      mockWorkflowsService.validateWorkflow.mockResolvedValue(expectedResult);

      const result = await api.validateWorkflow('name: Test', 'default', mockRequest);

      expect(mockWorkflowsService.validateWorkflow).toHaveBeenCalledWith(
        'name: Test',
        'default',
        mockRequest
      );
      expect(result).toBe(expectedResult);
    });

    it('should pass through diagnostics from service', async () => {
      const expectedResult = {
        valid: false,
        diagnostics: [
          { severity: 'error' as const, message: 'Required', source: 'schema', path: ['name'] },
        ],
      };
      mockWorkflowsService.validateWorkflow.mockResolvedValue(expectedResult);

      const result = await api.validateWorkflow('invalid: yaml', 'my-space', mockRequest);

      expect(mockWorkflowsService.validateWorkflow).toHaveBeenCalledWith(
        'invalid: yaml',
        'my-space',
        mockRequest
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('SML notifications', () => {
    let mockSmlIndex: jest.MockedFunction<SmlIndexAttachmentFn>;
    let mockSmlLogger: jest.Mocked<Logger>;

    const createWorkflowDto = (overrides: Partial<WorkflowDetailDto> = {}): WorkflowDetailDto => ({
      id: 'wf-1',
      name: 'Test Workflow',
      description: 'A test workflow',
      enabled: true,
      yaml: 'name: Test Workflow',
      valid: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      createdBy: 'user',
      lastUpdatedAt: '2025-01-01T00:00:00.000Z',
      lastUpdatedBy: 'user',
      definition: null,
      ...overrides,
    });

    beforeEach(() => {
      mockSmlIndex = jest.fn().mockResolvedValue(undefined);
      mockSmlLogger = { warn: jest.fn(), debug: jest.fn(), info: jest.fn() } as any;
      api.setSmlIndexAttachment(mockSmlIndex, mockSmlLogger);
    });

    it('does not notify SML when setSmlIndexAttachment has not been called', async () => {
      const freshApi = new WorkflowsManagementApi(
        mockWorkflowsService,
        mockGetWorkflowsExecutionEngine
      );
      mockWorkflowsService.createWorkflow.mockResolvedValue(createWorkflowDto());

      await freshApi.createWorkflow({ yaml: 'name: Test' }, 'default', mockRequest);

      expect(mockSmlIndex).not.toHaveBeenCalled();
    });

    it('notifies SML with "create" action on createWorkflow', async () => {
      mockWorkflowsService.createWorkflow.mockResolvedValue(createWorkflowDto({ id: 'wf-new' }));

      await api.createWorkflow({ yaml: 'name: Test' }, 'default', mockRequest);

      expect(mockSmlIndex).toHaveBeenCalledWith({
        request: mockRequest,
        originId: 'wf-new',
        attachmentType: WORKFLOW_SML_TYPE,
        action: 'create',
      });
    });

    it('notifies SML with "create" action on cloneWorkflow', async () => {
      const original = createWorkflowDto();
      mockWorkflowsService.createWorkflow.mockResolvedValue(createWorkflowDto({ id: 'wf-clone' }));

      await api.cloneWorkflow(original, 'default', mockRequest);

      expect(mockSmlIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          originId: 'wf-clone',
          action: 'create',
        })
      );
    });

    it('notifies SML with "update" action on updateWorkflow', async () => {
      mockWorkflowsService.getWorkflow.mockResolvedValue(createWorkflowDto({ id: 'wf-upd' }));
      mockWorkflowsService.updateWorkflow.mockResolvedValue({} as any);

      await api.updateWorkflow('wf-upd', { name: 'Updated' }, 'default', mockRequest);

      expect(mockSmlIndex).toHaveBeenCalledWith({
        request: mockRequest,
        originId: 'wf-upd',
        attachmentType: WORKFLOW_SML_TYPE,
        action: 'update',
      });
    });

    it('notifies SML with "delete" action for each successfully deleted workflow', async () => {
      mockWorkflowsService.deleteWorkflows.mockResolvedValue({
        total: 2,
        deleted: 2,
        failures: [],
        successfulIds: ['wf-a', 'wf-b'],
      });

      await api.deleteWorkflows(['wf-a', 'wf-b'], 'default', mockRequest);

      expect(mockSmlIndex).toHaveBeenCalledTimes(2);
      expect(mockSmlIndex).toHaveBeenCalledWith(
        expect.objectContaining({ originId: 'wf-a', action: 'delete' })
      );
      expect(mockSmlIndex).toHaveBeenCalledWith(
        expect.objectContaining({ originId: 'wf-b', action: 'delete' })
      );
    });

    it('does not notify SML on delete when successfulIds is undefined', async () => {
      mockWorkflowsService.deleteWorkflows.mockResolvedValue({
        total: 1,
        deleted: 0,
        failures: [{ id: 'wf-x', error: 'not found' }],
      });

      await api.deleteWorkflows(['wf-x'], 'default', mockRequest);

      expect(mockSmlIndex).not.toHaveBeenCalled();
    });

    it('notifies SML with "create" for each workflow in bulkCreateWorkflows', async () => {
      mockWorkflowsService.bulkCreateWorkflows.mockResolvedValue({
        created: [createWorkflowDto({ id: 'wf-b1' }), createWorkflowDto({ id: 'wf-b2' })],
        failed: [],
      });

      await api.bulkCreateWorkflows(
        [{ yaml: 'name: W1' }, { yaml: 'name: W2' }],
        'default',
        mockRequest
      );

      expect(mockSmlIndex).toHaveBeenCalledTimes(2);
      expect(mockSmlIndex).toHaveBeenCalledWith(
        expect.objectContaining({ originId: 'wf-b1', action: 'create' })
      );
      expect(mockSmlIndex).toHaveBeenCalledWith(
        expect.objectContaining({ originId: 'wf-b2', action: 'create' })
      );
    });

    it('uses "update" action in bulkCreateWorkflows when overwrite is true', async () => {
      mockWorkflowsService.bulkCreateWorkflows.mockResolvedValue({
        created: [createWorkflowDto({ id: 'wf-ow' })],
        failed: [],
      });

      await api.bulkCreateWorkflows([{ yaml: 'name: W1' }], 'default', mockRequest, {
        overwrite: true,
      });

      expect(mockSmlIndex).toHaveBeenCalledWith(
        expect.objectContaining({ originId: 'wf-ow', action: 'update' })
      );
    });

    it('logs warning when SML indexing fails but does not throw', async () => {
      mockSmlIndex.mockRejectedValue(new Error('SML unavailable'));
      mockWorkflowsService.createWorkflow.mockResolvedValue(createWorkflowDto({ id: 'wf-err' }));

      const result = await api.createWorkflow({ yaml: 'name: Test' }, 'default', mockRequest);

      expect(result.id).toBe('wf-err');
      await new Promise((r) => setImmediate(r));
      expect(mockSmlLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to create SML index for workflow 'wf-err'")
      );
    });
  });

  describe('scheduleWorkflow', () => {
    it('should pass event-driven trigger id (TriggerId) through to execution engine context', async () => {
      const mockWorkflowsExecutionEngine = {
        scheduleWorkflow: jest
          .fn()
          .mockResolvedValue({ workflowExecutionId: 'scheduled-exec-123' }),
        isEventDrivenExecutionEnabled: jest.fn().mockReturnValue(true),
        isLogTriggerEventsEnabled: jest.fn().mockReturnValue(true),
      };
      mockGetWorkflowsExecutionEngine.mockResolvedValue(mockWorkflowsExecutionEngine);

      const workflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        enabled: true,
        definition: { triggers: [{ type: 'cases.updated' }], steps: [] },
        yaml: 'name: Test Workflow\ntriggers: [{ type: "cases.updated" }]\nsteps: []',
      };
      const spaceId = 'default';
      const eventPayload = { caseId: 'case-1', status: 'open' };
      const inputs = { event: eventPayload };
      const triggeredBy = 'cases.updated';

      const result = await api.scheduleWorkflow(
        workflow as any,
        spaceId,
        inputs,
        mockRequest,
        triggeredBy
      );

      expect(mockGetWorkflowsExecutionEngine).toHaveBeenCalled();
      expect(mockWorkflowsExecutionEngine.scheduleWorkflow).toHaveBeenCalledTimes(1);
      const [passedWorkflow, passedContext, passedRequest] =
        mockWorkflowsExecutionEngine.scheduleWorkflow.mock.calls[0];
      expect(passedWorkflow).toEqual(workflow);
      expect(passedContext.triggeredBy).toBe('cases.updated');
      expect(passedContext.spaceId).toBe(spaceId);
      expect(passedContext.event).toEqual(eventPayload);
      expect(passedRequest).toBe(mockRequest);
      expect(result).toBe('scheduled-exec-123');
    });

    it('passes schedule metadata through to the execution engine context', async () => {
      const mockWorkflowsExecutionEngine = {
        scheduleWorkflow: jest
          .fn()
          .mockResolvedValue({ workflowExecutionId: 'scheduled-with-meta' }),
        isEventDrivenExecutionEnabled: jest.fn().mockReturnValue(true),
        isLogTriggerEventsEnabled: jest.fn().mockReturnValue(true),
      };
      mockGetWorkflowsExecutionEngine.mockResolvedValue(mockWorkflowsExecutionEngine);

      const workflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        enabled: true,
        definition: { triggers: [{ type: 'cases.updated' }], steps: [] },
        yaml: 'name: Test Workflow\ntriggers: [{ type: "cases.updated" }]\nsteps: []',
      };
      const scheduleMeta = {
        eventDispatchTimestamp: '2024-01-01T00:00:00.000Z',
        eventTriggerId: 'cases.updated',
      };

      await api.scheduleWorkflow(
        workflow as any,
        'default',
        { event: { caseId: '1' } },
        mockRequest,
        'cases.updated',
        scheduleMeta
      );

      const [, passedContext] = mockWorkflowsExecutionEngine.scheduleWorkflow.mock.calls[0];
      expect(passedContext.metadata).toEqual(scheduleMeta);
    });
  });

  describe('bulkScheduleWorkflow', () => {
    const workflowA = {
      id: 'wf-a',
      name: 'Workflow A',
      enabled: true,
      definition: { triggers: [{ type: 'manual' }], steps: [] },
      yaml: 'name: Workflow A',
    };
    const workflowB = {
      id: 'wf-b',
      name: 'Workflow B',
      enabled: true,
      definition: { triggers: [{ type: 'manual' }], steps: [] },
      yaml: 'name: Workflow B',
    };

    it('returns an empty result and forwards an empty array to the engine', async () => {
      const mockWorkflowsExecutionEngine = {
        bulkScheduleWorkflow: jest.fn().mockResolvedValue([]),
      };
      mockGetWorkflowsExecutionEngine.mockResolvedValue(mockWorkflowsExecutionEngine);

      const result = await api.bulkScheduleWorkflow([], mockRequest);

      expect(result).toEqual([]);
      expect(mockWorkflowsExecutionEngine.bulkScheduleWorkflow).toHaveBeenCalledWith(
        [],
        mockRequest
      );
    });

    it('forwards items to the engine with a single per-batch call and the expected context shape', async () => {
      const engineResults = [
        { status: 'scheduled' as const, workflowExecutionId: 'exec-1' },
        { status: 'scheduled' as const, workflowExecutionId: 'exec-2' },
      ];
      const mockWorkflowsExecutionEngine = {
        bulkScheduleWorkflow: jest.fn().mockResolvedValue(engineResults),
      };
      mockGetWorkflowsExecutionEngine.mockResolvedValue(mockWorkflowsExecutionEngine);

      const result = await api.bulkScheduleWorkflow(
        [
          {
            workflow: workflowA as any,
            spaceId: 'space-one',
            inputs: { event: { k: 1 }, manualKey: 'a' },
            triggeredBy: 'trigger-a',
          },
          {
            workflow: workflowB as any,
            spaceId: 'space-two',
            inputs: { event: { k: 2 } },
            triggeredBy: 'trigger-b',
          },
        ],
        mockRequest
      );

      expect(result).toBe(engineResults);
      expect(mockWorkflowsExecutionEngine.bulkScheduleWorkflow).toHaveBeenCalledTimes(1);

      const [passedItems, passedRequest] =
        mockWorkflowsExecutionEngine.bulkScheduleWorkflow.mock.calls[0];
      expect(passedRequest).toBe(mockRequest);
      expect(passedItems).toEqual([
        {
          workflow: workflowA,
          context: {
            event: { k: 1 },
            spaceId: 'space-one',
            inputs: { manualKey: 'a' },
            triggeredBy: 'trigger-a',
          },
        },
        {
          workflow: workflowB,
          context: {
            event: { k: 2 },
            spaceId: 'space-two',
            inputs: {},
            triggeredBy: 'trigger-b',
          },
        },
      ]);
    });

    it('passes optional metadata on each item into the forwarded execution context', async () => {
      const mockWorkflowsExecutionEngine = {
        bulkScheduleWorkflow: jest
          .fn()
          .mockResolvedValue([{ status: 'scheduled', workflowExecutionId: 'exec-meta' }]),
      };
      mockGetWorkflowsExecutionEngine.mockResolvedValue(mockWorkflowsExecutionEngine);

      const meta = {
        eventDispatchTimestamp: '2024-01-01T00:00:00.000Z',
        eventTriggerId: 'cases.updated',
        eventId: 'evt-1',
      };

      await api.bulkScheduleWorkflow(
        [
          {
            workflow: workflowA as any,
            spaceId: 'default',
            inputs: { event: { x: 1 } },
            triggeredBy: 'cases.updated',
            metadata: meta,
          },
        ],
        mockRequest
      );

      const [passedItems] = mockWorkflowsExecutionEngine.bulkScheduleWorkflow.mock.calls[0];
      expect(passedItems).toHaveLength(1);
      expect(passedItems[0].context.metadata).toEqual(meta);
    });

    it('passes the engine result through unchanged (order + per-item errors)', async () => {
      const engineResults = [
        { status: 'scheduled' as const, workflowExecutionId: 'exec-ok' },
        {
          status: 'error' as const,
          error: { message: 'schedule failed', code: 'SCHEDULE_ERR' },
        },
        { status: 'scheduled' as const, workflowExecutionId: 'exec-ok-2' },
      ];
      const mockWorkflowsExecutionEngine = {
        bulkScheduleWorkflow: jest.fn().mockResolvedValue(engineResults),
      };
      mockGetWorkflowsExecutionEngine.mockResolvedValue(mockWorkflowsExecutionEngine);

      const result = await api.bulkScheduleWorkflow(
        [
          { workflow: workflowA as any, spaceId: 'default', inputs: {}, triggeredBy: 't1' },
          { workflow: workflowB as any, spaceId: 'default', inputs: {}, triggeredBy: 't2' },
          { workflow: workflowA as any, spaceId: 'default', inputs: {}, triggeredBy: 't3' },
        ],
        mockRequest
      );

      expect(result).toBe(engineResults);
    });
  });
});
