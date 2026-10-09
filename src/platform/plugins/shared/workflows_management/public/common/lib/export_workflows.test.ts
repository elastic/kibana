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
  findMissingReferencedIds,
  resolveAllReferences,
} from './export_workflows';

const mockDownloadFileAs = jest.fn();
jest.mock('@kbn/share-plugin/public', () => ({
  downloadFileAs: (...args: unknown[]) => mockDownloadFileAs(...args),
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

const mockGenerateWorkflowsZip = jest
  .fn()
  .mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }));
jest.mock('./export/generate_zip_archive', () => ({
  generateWorkflowsZip: (...args: unknown[]) => mockGenerateWorkflowsZip(...args),
}));

const createMockWorkflowApi = (
  yamlEntries: Array<{ id: string; yaml: string }> = [
    { id: 'w-1', yaml: 'name: First\nsteps: []' },
    { id: 'w-2', yaml: 'name: Second\nsteps: []' },
  ]
): jest.Mocked<WorkflowApi> =>
  ({
    exportWorkflows: jest.fn().mockResolvedValue({
      entries: yamlEntries,
      manifest: {
        exportedCount: yamlEntries.length,
        exportedAt: '2026-01-01T00:00:00.000Z',
        version: '1',
      },
    }),
  } as unknown as jest.Mocked<WorkflowApi>);

describe('export_workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportSingleWorkflow', () => {
    it('should call api.exportWorkflows with the workflow id and download stored yaml as .yml', async () => {
      const storedYaml = '# comment\nname: My_Workflow\nenabled: true\nsteps: []';
      const api = createMockWorkflowApi([{ id: 'w-1', yaml: storedYaml }]);
      await exportSingleWorkflow(createWorkflow({ id: 'w-1', name: 'My Workflow' }), api);

      expect(api.exportWorkflows).toHaveBeenCalledWith({ ids: ['w-1'] });
      expect(mockDownloadFileAs).toHaveBeenCalledTimes(1);
      const [filename, content] = mockDownloadFileAs.mock.calls[0];
      expect(filename).toBe('My_Workflow.yml');
      expect(content.type).toBe('text/yaml');
      // The stored yaml (with comment + enabled: true) must be preserved verbatim
      expect(content.content).toBe(storedYaml);
    });

    it('should sanitize special characters in workflow name', async () => {
      const api = createMockWorkflowApi([{ id: 'w-1', yaml: 'name: w' }]);
      await exportSingleWorkflow(createWorkflow({ name: 'Hello World! @#$%' }), api);

      const [filename] = mockDownloadFileAs.mock.calls[0];
      expect(filename).toBe('Hello_World.yml');
    });

    it('should fall back to workflow_export.yml when name is all special chars', async () => {
      const api = createMockWorkflowApi([{ id: 'w-1', yaml: 'name: w' }]);
      await exportSingleWorkflow(createWorkflow({ name: '!@#$%^&*()' }), api);

      const [filename] = mockDownloadFileAs.mock.calls[0];
      expect(filename).toBe('workflow_export.yml');
    });

    it('should no-op when definition is null', async () => {
      const api = createMockWorkflowApi();
      await exportSingleWorkflow(createWorkflow({ definition: null }), api);

      expect(api.exportWorkflows).not.toHaveBeenCalled();
      expect(mockDownloadFileAs).not.toHaveBeenCalled();
    });

    it('should no-op when the server returns no entries', async () => {
      const api = createMockWorkflowApi([]);
      await exportSingleWorkflow(createWorkflow({ id: 'w-1' }), api);

      expect(mockDownloadFileAs).not.toHaveBeenCalled();
    });
  });

  describe('exportWorkflows', () => {
    it('should call api.exportWorkflows and download as .yml for a single workflow', async () => {
      const storedYaml = 'name: Test Workflow\nenabled: true\nsteps: []';
      const api = createMockWorkflowApi([{ id: 'w-1', yaml: storedYaml }]);
      const result = await exportWorkflows([createWorkflow({ id: 'w-1' })], api);

      expect(result).toBe(1);
      expect(api.exportWorkflows).toHaveBeenCalledWith({ ids: ['w-1'] });
      const [filename, content] = mockDownloadFileAs.mock.calls[0];
      expect(filename).toMatch(/\.yml$/);
      expect(content.type).toBe('text/yaml');
      expect(content.content).toBe(storedYaml);
    });

    it('should fetch entries from API and build ZIP client-side for multiple workflows', async () => {
      const api = createMockWorkflowApi();
      const workflows = [
        createWorkflow({ id: 'w-1', name: 'First' }),
        createWorkflow({ id: 'w-2', name: 'Second' }),
      ];
      const result = await exportWorkflows(workflows, api);

      expect(result).toBe(2);
      expect(api.exportWorkflows).toHaveBeenCalledWith({ ids: ['w-1', 'w-2'] });
      expect(mockGenerateWorkflowsZip).toHaveBeenCalledWith(
        [
          { id: 'w-1', yaml: 'name: First\nsteps: []' },
          { id: 'w-2', yaml: 'name: Second\nsteps: []' },
        ],
        {
          exportedCount: 2,
          exportedAt: '2026-01-01T00:00:00.000Z',
          version: '1',
        }
      );
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
      const api = createMockWorkflowApi([{ id: 'w-1', yaml: 'name: Has Def\nsteps: []' }]);
      const workflows = [
        createWorkflow({ id: 'w-1', name: 'Has Def' }),
        createWorkflow({ id: 'w-2', name: 'No Def', definition: null }),
      ];
      const result = await exportWorkflows(workflows, api);

      expect(result).toBe(1);
      const [filename] = mockDownloadFileAs.mock.calls[0];
      expect(filename).toMatch(/\.yml$/);
    });

    it('should propagate HTTP errors from the _export API', async () => {
      const api = createMockWorkflowApi();
      api.exportWorkflows.mockRejectedValue(new Error('Network error'));
      const workflows = [
        createWorkflow({ id: 'w-1', name: 'First' }),
        createWorkflow({ id: 'w-2', name: 'Second' }),
      ];

      await expect(exportWorkflows(workflows, api)).rejects.toThrow('Network error');
    });
  });

  describe('findMissingReferencedIds', () => {
    const createWorkflowWithRefs = (id: string, referencedIds: string[]): WorkflowListItemDto => {
      const steps = referencedIds.map((refId) => ({
        type: 'workflow.execute',
        with: { 'workflow-id': refId },
      }));
      return createWorkflow({
        id,
        definition: { steps } as unknown as WorkflowListItemDto['definition'],
      });
    };

    it('should return empty when no workflows reference others', () => {
      const workflows = [createWorkflow({ id: 'w-1' }), createWorkflow({ id: 'w-2' })];
      expect(findMissingReferencedIds(workflows)).toEqual([]);
    });

    it('should return IDs referenced but not in the export set', () => {
      const workflows = [createWorkflowWithRefs('w-1', ['w-2', 'w-3'])];
      const missing = findMissingReferencedIds(workflows);
      expect(missing).toEqual(expect.arrayContaining(['w-2', 'w-3']));
      expect(missing).toHaveLength(2);
    });

    it('should not return IDs already in the export set', () => {
      const workflows = [createWorkflowWithRefs('w-1', ['w-2']), createWorkflow({ id: 'w-2' })];
      expect(findMissingReferencedIds(workflows)).toEqual([]);
    });

    it('should skip workflows with null definitions', () => {
      const workflows = [createWorkflow({ id: 'w-1', definition: null })];
      expect(findMissingReferencedIds(workflows)).toEqual([]);
    });

    it('should deduplicate when multiple workflows reference the same external ID', () => {
      const workflows = [
        createWorkflowWithRefs('w-1', ['w-external']),
        createWorkflowWithRefs('w-2', ['w-external']),
      ];
      expect(findMissingReferencedIds(workflows)).toEqual(['w-external']);
    });
  });

  describe('resolveAllReferences', () => {
    const createWorkflowWithRefs = (id: string, referencedIds: string[]): WorkflowListItemDto => {
      const steps = referencedIds.map((refId) => ({
        type: 'workflow.execute',
        with: { 'workflow-id': refId },
      }));
      return createWorkflow({
        id,
        definition: { steps } as unknown as WorkflowListItemDto['definition'],
      });
    };

    it('should resolve direct references (depth 1)', () => {
      const wA = createWorkflowWithRefs('a', ['b']);
      const wB = createWorkflow({ id: 'b' });
      const allMap = new Map([
        ['a', wA],
        ['b', wB],
      ]);

      const result = resolveAllReferences([wA], allMap);
      const ids = result.map((w) => w.id);
      expect(ids).toEqual(expect.arrayContaining(['a', 'b']));
      expect(ids).toHaveLength(2);
    });

    it('should resolve transitive references (depth 2: A->B->C)', () => {
      const wA = createWorkflowWithRefs('a', ['b']);
      const wB = createWorkflowWithRefs('b', ['c']);
      const wC = createWorkflow({ id: 'c' });
      const allMap = new Map([
        ['a', wA],
        ['b', wB],
        ['c', wC],
      ]);

      const result = resolveAllReferences([wA], allMap);
      const ids = result.map((w) => w.id);
      expect(ids).toEqual(expect.arrayContaining(['a', 'b', 'c']));
      expect(ids).toHaveLength(3);
    });

    it('should stop at MAX_RESOLVE_DEPTH (10)', () => {
      // Build a chain: w0 -> w1 -> w2 -> ... -> w11
      const allWorkflows: WorkflowListItemDto[] = [];
      for (let i = 0; i <= 11; i++) {
        const refs = i < 11 ? [`w${i + 1}`] : [];
        allWorkflows.push(createWorkflowWithRefs(`w${i}`, refs));
      }
      const allMap = new Map(allWorkflows.map((w) => [w.id, w]));

      const result = resolveAllReferences([allWorkflows[0]], allMap);
      const ids = result.map((w) => w.id);

      // w0 is initial (depth 0), w1..w10 are resolved (depths 1-10), w11 should be excluded
      expect(ids).toContain('w0');
      expect(ids).toContain('w10');
      expect(ids).not.toContain('w11');
    });

    it('should handle circular references (A->B->A) without infinite loop', () => {
      const wA = createWorkflowWithRefs('a', ['b']);
      const wB = createWorkflowWithRefs('b', ['a']);
      const allMap = new Map([
        ['a', wA],
        ['b', wB],
      ]);

      const result = resolveAllReferences([wA], allMap);
      const ids = result.map((w) => w.id);
      expect(ids).toEqual(expect.arrayContaining(['a', 'b']));
      expect(ids).toHaveLength(2);
    });

    it('should handle diamond references (A->B, A->C, B->D, C->D)', () => {
      const wA = createWorkflowWithRefs('a', ['b', 'c']);
      const wB = createWorkflowWithRefs('b', ['d']);
      const wC = createWorkflowWithRefs('c', ['d']);
      const wD = createWorkflow({ id: 'd' });
      const allMap = new Map([
        ['a', wA],
        ['b', wB],
        ['c', wC],
        ['d', wD],
      ]);

      const result = resolveAllReferences([wA], allMap);
      const ids = result.map((w) => w.id);
      expect(ids).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd']));
      expect(ids).toHaveLength(4);
    });

    it('should skip missing references not in allWorkflowsMap', () => {
      const wA = createWorkflowWithRefs('a', ['missing']);
      const allMap = new Map([['a', wA]]);

      const result = resolveAllReferences([wA], allMap);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a');
    });

    it('should include workflows with null definitions in result without crashing', () => {
      const wA = createWorkflow({ id: 'a', definition: null });
      const allMap = new Map([['a', wA]]);

      const result = resolveAllReferences([wA], allMap);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a');
    });
  });
});
