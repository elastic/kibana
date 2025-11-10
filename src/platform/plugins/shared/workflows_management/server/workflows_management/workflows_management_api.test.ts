/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { z } from '@kbn/zod';
import { WorkflowsManagementApi } from './workflows_management_api';
import type { WorkflowsService } from './workflows_management_service';

describe('WorkflowsManagementApi', () => {
  let api: WorkflowsManagementApi;
  let mockWorkflowsService: jest.Mocked<WorkflowsService>;
  let mockGetWorkflowsExecutionEngine: jest.Mock;
  let mockRequest: KibanaRequest;

  beforeEach(() => {
    mockWorkflowsService = {
      getWorkflowZodSchema: jest.fn(),
      createWorkflow: jest.fn(),
    } as any;

    mockGetWorkflowsExecutionEngine = jest.fn();

    api = new WorkflowsManagementApi(mockWorkflowsService, mockGetWorkflowsExecutionEngine);

    mockRequest = httpServerMock.createKibanaRequest();
  });

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

    const createMockZodSchema = () => {
      return z.object({
        name: z.string(),
        description: z.string().optional(),
        enabled: z.boolean().optional(),
        steps: z.array(z.any()).optional(),
      });
    };

    it('should clone workflow successfully with updated name', async () => {
      const originalWorkflow = createMockWorkflow();
      const mockZodSchema = createMockZodSchema();

      mockWorkflowsService.getWorkflowZodSchema.mockResolvedValue(mockZodSchema);

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
        { loose: true },
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
        { loose: true },
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
});
