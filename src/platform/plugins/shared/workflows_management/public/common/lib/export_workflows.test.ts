/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowListItemDto } from '@kbn/workflows';
import type { WorkflowApi } from '@kbn/workflows-ui';
import {
  exportSingleWorkflow,
  exportWorkflows,
  prepareSingleWorkflowExport,
} from './export_workflows';

const mockDownloadFileAs = jest.fn();
jest.mock('@kbn/share-plugin/public', () => ({
  downloadFileAs: (...args: unknown[]) => mockDownloadFileAs(...args),
}));

jest.mock('../../../common/lib/yaml', () => ({
  stringifyWorkflowDefinition: (def: unknown) => `stringified:${JSON.stringify(def)}`,
}));

const createWorkflow = (overrides: Partial<WorkflowListItemDto> = {}): WorkflowListItemDto => ({
  id: 'w-1',
  name: 'Test Workflow',
  description: 'desc',
  enabled: true,
  definition: { steps: [] } as unknown as WorkflowListItemDto['definition'],
  createdAt: '2026-01-01T00:00:00Z',
  history: [],
  valid: true,
  ...overrides,
});

const createMockWorkflowApi = (): WorkflowApi =>
  ({
    exportWorkflows: jest
      .fn()
      .mockResolvedValue(new Blob(['zip-data'], { type: 'application/zip' })),
  } as unknown as WorkflowApi);

describe('export_workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('prepareSingleWorkflowExport', () => {
    it('should return filename and payload for a workflow with a definition', () => {
      const result = prepareSingleWorkflowExport(createWorkflow({ name: 'My Workflow' }));

      expect(result).not.toBeNull();
      expect(result!.filename).toBe('My_Workflow.yml');
      expect(result!.content.type).toBe('text/yaml');
      // the content property is exposed for testing puroposes
      expect((result!.content as { content: string }).content).toContain('stringified:');
    });

    it('should sanitize special characters in workflow name', () => {
      const result = prepareSingleWorkflowExport(createWorkflow({ name: 'Hello World! @#$%' }));

      expect(result!.filename).toBe('Hello_World.yml');
    });

    it('should fall back to workflow_export.yml when name is all special chars', () => {
      const result = prepareSingleWorkflowExport(createWorkflow({ name: '!@#$%^&*()' }));

      expect(result!.filename).toBe('workflow_export.yml');
    });

    it('should return null when definition is null', () => {
      const result = prepareSingleWorkflowExport(createWorkflow({ definition: null }));

      expect(result).toBeNull();
    });
  });

  describe('exportSingleWorkflow', () => {
    it('should call downloadFileAs with .yml extension and yaml content', () => {
      exportSingleWorkflow(createWorkflow({ name: 'My Workflow' }));

      expect(mockDownloadFileAs).toHaveBeenCalledTimes(1);
      const [filename, opts] = mockDownloadFileAs.mock.calls[0];
      expect(filename).toBe('My_Workflow.yml');
      expect(opts.type).toBe('text/yaml');
      expect(opts.content).toContain('stringified:');
    });

    it('should no-op when definition is null', () => {
      exportSingleWorkflow(createWorkflow({ definition: null }));

      expect(mockDownloadFileAs).not.toHaveBeenCalled();
    });
  });

  describe('exportWorkflows', () => {
    it('should export single workflow as YAML when array has length 1', async () => {
      const api = createMockWorkflowApi();
      const result = await exportWorkflows([createWorkflow()], api);

      expect(result).toBe(1);
      const [filename] = mockDownloadFileAs.mock.calls[0];
      expect(filename).toMatch(/\.yml$/);
      expect(api.exportWorkflows).not.toHaveBeenCalled();
    });

    it('should export multiple workflows as ZIP via WorkflowApi', async () => {
      const api = createMockWorkflowApi();
      const workflows = [
        createWorkflow({ id: 'w-1', name: 'First' }),
        createWorkflow({ id: 'w-2', name: 'Second' }),
      ];
      const result = await exportWorkflows(workflows, api);

      expect(result).toBe(2);
      expect(api.exportWorkflows).toHaveBeenCalledWith({ ids: ['w-1', 'w-2'] });
      expect(mockDownloadFileAs).toHaveBeenCalledTimes(1);
      const [filename, payload] = mockDownloadFileAs.mock.calls[0];
      expect(filename).toMatch(/^workflows_export_.*\.zip$/);
      expect(payload).toBeInstanceOf(Blob);
    });

    it('should return 0 and skip download when all definitions are null', async () => {
      const api = createMockWorkflowApi();
      const workflows = [
        createWorkflow({ definition: null }),
        createWorkflow({ definition: null }),
      ];
      const result = await exportWorkflows(workflows, api);

      expect(result).toBe(0);
      expect(mockDownloadFileAs).not.toHaveBeenCalled();
      expect(api.exportWorkflows).not.toHaveBeenCalled();
    });

    it('should only export workflows with non-null definitions', async () => {
      const api = createMockWorkflowApi();
      const workflows = [
        createWorkflow({ id: 'w-1', name: 'Has Def' }),
        createWorkflow({ id: 'w-2', name: 'No Def', definition: null }),
      ];
      const result = await exportWorkflows(workflows, api);

      expect(result).toBe(1);
      const [filename] = mockDownloadFileAs.mock.calls[0];
      expect(filename).toMatch(/\.yml$/);
    });
  });
});
