/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { WorkflowDetailDto, WorkflowListDto } from '@kbn/workflows';
import { createMockWorkflowApi } from '@kbn/workflows-ui/src/api/workflows_api.mock';
import { useWorkflowActions } from './use_workflow_actions';
import { parseImportFile } from '../../../features/import_workflows/lib/parse_import_file';
import type { ClientPreflightResult } from '../../../features/import_workflows/lib/parse_import_file';
import { useTelemetry } from '../../../hooks/use_telemetry';
import {
  createMockWorkflowDetailDto,
  createMockWorkflowListItemDto,
} from '../../../shared/test_utils/mock_workflow_factories';

const mockParseImportFile = parseImportFile as jest.MockedFunction<typeof parseImportFile>;

jest.mock('../../../features/import_workflows/lib/parse_import_file');
jest.mock('../../../hooks/use_telemetry');
jest.mock('@kbn/workflows-ui', () => ({
  useRunWorkflow: ({ onSuccess, onError }: { onSuccess: Function; onError: Function }) => ({
    mutate: jest.fn((...args: unknown[]) => {
      try {
        onSuccess(undefined, args[0]);
      } catch {
        // no-op
      }
    }),
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
    data: undefined,
    error: null,
    reset: jest.fn(),
    onSuccess,
    onError,
  }),
}));

const mockWorkflowApi = createMockWorkflowApi();
jest.mock('@kbn/workflows-ui', () => {
  return {
    useRunWorkflow: () => ({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isLoading: false,
      data: undefined,
      error: null,
      reset: jest.fn(),
    }),
    useWorkflowsApi: () => mockWorkflowApi,
  };
});

const mockUseTelemetry = useTelemetry as jest.MockedFunction<typeof useTelemetry>;

const createFile = (name: string, content: string): File =>
  new File([content], name, { type: 'text/plain' });

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });

describe('useWorkflowActions – import mutations', () => {
  let mockTelemetry: Record<string, jest.Mock>;
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTelemetry = {
      reportWorkflowUpdated: jest.fn(),
      reportWorkflowDeleted: jest.fn(),
      reportWorkflowCloned: jest.fn(),
      reportWorkflowRunInitiated: jest.fn(),
      reportWorkflowStepTestRunInitiated: jest.fn(),
    };

    mockUseTelemetry.mockReturnValue(mockTelemetry as unknown as ReturnType<typeof useTelemetry>);

    queryClient = createQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  // ---------------------------------------------------------------------------
  // preflightImportWorkflows (client-side parsing + server conflict check)
  // ---------------------------------------------------------------------------
  describe('preflightImportWorkflows', () => {
    const clientParseResult: ClientPreflightResult = {
      format: 'yaml',
      totalWorkflows: 1,
      parseErrors: [],
      workflows: [
        {
          id: 'w-1',
          name: 'W1',
          description: null,
          triggers: [],
          inputCount: 0,
          stepCount: 1,
          valid: true,
        },
      ],
      workflowIds: ['w-1'],
      rawWorkflows: [{ id: 'w-1', originalId: 'w-1', yaml: 'name: W1' }],
    };

    it('should parse the file client-side and check conflicts via mgetWorkflows', async () => {
      mockParseImportFile.mockResolvedValueOnce(clientParseResult);
      mockWorkflowApi.mgetWorkflows.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });
      const file = createFile('test.yml', 'name: Test');

      act(() => {
        result.current.preflightImportWorkflows.mutate({ file });
      });

      await waitFor(() => expect(result.current.preflightImportWorkflows.isSuccess).toBe(true));

      expect(mockParseImportFile).toHaveBeenCalledWith(file);
      expect(mockWorkflowApi.mgetWorkflows).toHaveBeenCalledTimes(1);
      expect(mockWorkflowApi.mgetWorkflows).toHaveBeenCalledWith({
        ids: ['w-1'],
        source: ['name'],
      });
    });

    it('should combine client parse results with server conflict data', async () => {
      const parseResult: ClientPreflightResult = {
        format: 'zip',
        totalWorkflows: 2,
        parseErrors: ['bad line'],
        workflows: [
          {
            id: 'w-1',
            name: 'Existing',
            description: null,
            triggers: [],
            inputCount: 0,
            stepCount: 0,
            valid: true,
          },
          {
            id: 'w-2',
            name: 'New',
            description: 'desc',
            triggers: [{ type: 'manual' }],
            inputCount: 1,
            stepCount: 2,
            valid: true,
          },
        ],
        workflowIds: ['w-1', 'w-2'],
        rawWorkflows: [
          { id: 'w-1', originalId: 'w-1', yaml: 'name: Existing' },
          { id: 'w-2', originalId: 'w-2', yaml: 'name: New' },
        ],
      };
      mockParseImportFile.mockResolvedValueOnce(parseResult);
      mockWorkflowApi.mgetWorkflows.mockResolvedValueOnce([{ id: 'w-1', name: 'Existing' }]);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.preflightImportWorkflows.mutate({ file: createFile('a.zip', 'zip') });
      });

      await waitFor(() => expect(result.current.preflightImportWorkflows.isSuccess).toBe(true));

      expect(result.current.preflightImportWorkflows.data).toEqual({
        format: 'zip',
        totalWorkflows: 2,
        conflicts: [{ id: 'w-1', existingName: 'Existing' }],
        parseErrors: ['bad line'],
        workflows: parseResult.workflows,
        rawWorkflows: parseResult.rawWorkflows,
      });
    });

    it('should surface client-side parse errors', async () => {
      mockParseImportFile.mockRejectedValueOnce(new Error('The uploaded file is empty'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.preflightImportWorkflows.mutate({ file: createFile('x.yml', '') });
      });

      await waitFor(() => expect(result.current.preflightImportWorkflows.isError).toBe(true));
      expect(result.current.preflightImportWorkflows.error?.message).toBe(
        'The uploaded file is empty'
      );
    });

    it('should be resettable after an error', async () => {
      mockParseImportFile.mockRejectedValueOnce(new Error('Parse error'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.preflightImportWorkflows.mutate({ file: createFile('x.yml', '') });
      });

      await waitFor(() => expect(result.current.preflightImportWorkflows.isError).toBe(true));

      act(() => {
        result.current.preflightImportWorkflows.reset();
      });

      await waitFor(() => {
        expect(result.current.preflightImportWorkflows.isError).toBe(false);
        expect(result.current.preflightImportWorkflows.error).toBeNull();
        expect(result.current.preflightImportWorkflows.data).toBeUndefined();
      });
    });

    it('should skip the conflict check when there are no workflow IDs', async () => {
      const emptyResult: ClientPreflightResult = {
        format: 'zip',
        totalWorkflows: 0,
        parseErrors: ['all entries invalid'],
        workflows: [],
        workflowIds: [],
        rawWorkflows: [],
      };
      mockParseImportFile.mockResolvedValueOnce(emptyResult);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.preflightImportWorkflows.mutate({ file: createFile('bad.zip', 'zip') });
      });

      await waitFor(() => expect(result.current.preflightImportWorkflows.isSuccess).toBe(true));

      expect(mockWorkflowApi.mgetWorkflows).not.toHaveBeenCalled();
      expect(result.current.preflightImportWorkflows.data?.conflicts).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // importWorkflows
  // ---------------------------------------------------------------------------
  describe('importWorkflows', () => {
    const workflows = [{ id: 'w-1', originalId: 'w-1', yaml: 'name: Test' }];
    const importSuccess = { created: [{ id: 'w-1', name: 'W1' } as WorkflowDetailDto], failed: [] };

    it('should call bulkCreateWorkflows with workflows and default overwrite when not specified', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows, conflictIds: [] });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      expect(mockWorkflowApi.bulkCreateWorkflows).toHaveBeenCalledWith({
        workflows: expect.arrayContaining([
          expect.objectContaining({ id: 'w-1', yaml: 'name: Test' }),
        ]),
        overwrite: undefined,
      });
    });

    it('should pass overwrite true to bulkCreateWorkflows when overwrite is true', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows, overwrite: true, conflictIds: [] });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      expect(mockWorkflowApi.bulkCreateWorkflows).toHaveBeenCalledWith({
        workflows: expect.arrayContaining([
          expect.objectContaining({ id: 'w-1', yaml: 'name: Test' }),
        ]),
        overwrite: true,
      });
    });

    it('should generate new IDs client-side when generateNewIds is true', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows, generateNewIds: true, conflictIds: [] });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [{ workflows: sentWorkflows, overwrite }] =
        mockWorkflowApi.bulkCreateWorkflows.mock.calls[0];
      expect(sentWorkflows).toHaveLength(1);
      // No conflicts → generateNewIds keeps the original slug-derived ID unchanged
      expect(sentWorkflows[0].id).toBe('w-1');
      expect(overwrite).toBeUndefined();
    });

    it('should postfix the ID when generateNewIds is true and the ID conflicts', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({
          workflows,
          generateNewIds: true,
          conflictIds: [{ id: 'w-1', existingName: 'Existing' }],
        });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [{ workflows: sentWorkflows }] = mockWorkflowApi.bulkCreateWorkflows.mock.calls[0];
      expect(sentWorkflows[0].id).toBe('w-1-1');
    });

    it('should generate new IDs and send overwrite when both flags are true', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({
          workflows,
          overwrite: true,
          generateNewIds: true,
          conflictIds: [],
        });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [{ workflows: sentWorkflows, overwrite }] =
        mockWorkflowApi.bulkCreateWorkflows.mock.calls[0];
      // No conflicts → ID unchanged
      expect(sentWorkflows[0].id).toBe('w-1');
      expect(overwrite).toBe(true);
    });

    it('should pass overwrite false when explicitly false', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({
          workflows,
          overwrite: false,
          generateNewIds: false,
          conflictIds: [],
        });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      expect(mockWorkflowApi.bulkCreateWorkflows).toHaveBeenCalledWith({
        workflows: expect.arrayContaining([
          expect.objectContaining({ id: 'w-1', yaml: 'name: Test' }),
        ]),
        overwrite: false,
      });
    });

    it('should invalidate workflows queries on success', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows, conflictIds: [] });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['workflows'] })
      );

      invalidateSpy.mockRestore();
    });

    it('should NOT invalidate queries on error', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockRejectedValueOnce(new Error('Server error'));
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows, conflictIds: [] });
      });

      await waitFor(() => expect(result.current.importWorkflows.isError).toBe(true));

      expect(invalidateSpy).not.toHaveBeenCalled();
      invalidateSpy.mockRestore();
    });

    it('should expose the import result via data', async () => {
      const response = {
        created: [
          { id: 'w-1', name: 'W1' },
          { id: 'w-2', name: 'W2' },
        ] as WorkflowDetailDto[],
        failed: [{ index: 2, id: 'w-3', error: 'invalid yaml' }],
      };
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(response);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows, conflictIds: [] });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));
      expect(result.current.importWorkflows.data).toEqual(response);
    });

    it('should surface API errors', async () => {
      const httpError = Object.assign(new Error('500 Internal Server Error'), {
        body: { statusCode: 500, message: 'Internal Server Error' },
      });
      mockWorkflowApi.bulkCreateWorkflows.mockRejectedValueOnce(httpError);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows, conflictIds: [] });
      });

      await waitFor(() => expect(result.current.importWorkflows.isError).toBe(true));
      expect(result.current.importWorkflows.error).toBe(httpError);
    });

    it('should be resettable after an error', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockRejectedValueOnce(new Error('fail'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows, conflictIds: [] });
      });

      await waitFor(() => expect(result.current.importWorkflows.isError).toBe(true));

      act(() => {
        result.current.importWorkflows.reset();
      });

      await waitFor(() => {
        expect(result.current.importWorkflows.isError).toBe(false);
        expect(result.current.importWorkflows.error).toBeNull();
        expect(result.current.importWorkflows.data).toBeUndefined();
      });
    });

    it('should be callable again after a successful import', async () => {
      const firstResponse = {
        created: [{ id: 'w-1' } as WorkflowDetailDto],
        failed: [],
        parseErrors: [],
      };
      const secondResponse = {
        created: [{ id: 'w-2' } as WorkflowDetailDto],
        failed: [],
        parseErrors: [],
      };
      mockWorkflowApi.bulkCreateWorkflows
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows, conflictIds: [] });
      });
      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));
      expect(result.current.importWorkflows.data).toEqual(firstResponse);

      act(() => {
        result.current.importWorkflows.mutate({
          workflows: [{ id: 'w-2', originalId: 'w-2', yaml: 'name: Second' }],
          conflictIds: [],
        });
      });
      await waitFor(() => expect(result.current.importWorkflows.data).toEqual(secondResponse));

      expect(mockWorkflowApi.bulkCreateWorkflows).toHaveBeenCalledTimes(2);
    });

    it('should rewrite cross-workflow references when generateNewIds is true', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);

      const parentYaml = [
        'name: Parent',
        'steps:',
        '  - name: call-child',
        '    type: workflow.execute',
        '    with:',
        '      workflow-id: child-1',
      ].join('\n');

      const childYaml = 'name: Child\nsteps: []';

      // id = slug-of-name (import ID), originalId = persisted export ID (used in YAML references)
      const workflowsWithRefs: Array<{ id: string; originalId: string; yaml: string }> = [
        { id: 'parent', originalId: 'parent-1', yaml: parentYaml },
        { id: 'child', originalId: 'child-1', yaml: childYaml },
      ];

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({
          workflows: workflowsWithRefs,
          generateNewIds: true,
          conflictIds: [],
        });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [{ workflows: sentWorkflows }] = mockWorkflowApi.bulkCreateWorkflows.mock.calls[0];

      // Both workflows should keep their slug-of-name IDs (no conflicts)
      const parentPayload = sentWorkflows.find((w: { id?: string; yaml: string }) =>
        w.yaml.includes('Parent')
      );
      const childPayload = sentWorkflows.find((w: { id?: string; yaml: string }) =>
        w.yaml.includes('Child')
      );

      expect(parentPayload).toBeDefined();
      expect(childPayload).toBeDefined();
      expect(parentPayload!.id).toBe('parent');
      expect(childPayload!.id).toBe('child');

      // The parent's YAML should reference the child's import ID ('child'), not the old 'child-1'
      expect(parentPayload!.yaml).toContain('workflow-id: child');
      expect(parentPayload!.yaml).not.toContain('workflow-id: child-1');
    });

    it('should preserve references as-is without generateNewIds when IDs are conforming', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);

      const parentYaml = [
        'name: Parent',
        'steps:',
        '  - name: call-child',
        '    type: workflow.execute',
        '    with:',
        '      workflow-id: child-processor',
      ].join('\n');

      const childYaml = 'name: Child\nsteps: []';

      // For conforming exports, originalId === id (export ID preserved)
      const workflowsWithRefs: Array<{ id: string; originalId: string; yaml: string }> = [
        { id: 'parent-workflow', originalId: 'parent-workflow', yaml: parentYaml },
        { id: 'child-processor', originalId: 'child-processor', yaml: childYaml },
      ];

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({
          workflows: workflowsWithRefs,
          conflictIds: [],
        });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [{ workflows: sentWorkflows }] = mockWorkflowApi.bulkCreateWorkflows.mock.calls[0];

      const parentPayload = sentWorkflows.find((w: { id?: string; yaml: string }) =>
        w.yaml.includes('Parent')
      );

      expect(parentPayload).toBeDefined();
      // References should be preserved unchanged — no rewriting needed
      expect(parentPayload!.yaml).toContain('workflow-id: child-processor');
      expect(parentPayload!.id).toBe('parent-workflow');
    });

    it('should rewrite references without generateNewIds only for legacy exports', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);

      const parentYaml = [
        'name: Parent',
        'steps:',
        '  - name: call-child',
        '    type: workflow.execute',
        '    with:',
        '      workflow-id: Old_Export_Id',
      ].join('\n');

      const childYaml = 'name: Child\nsteps: []';

      // Legacy export: originalId differs from id because the old ID
      // didn't conform to the new pattern and was regenerated to a slug.
      const workflowsWithRefs: Array<{ id: string; originalId: string; yaml: string }> = [
        { id: 'parent', originalId: 'Old_Parent_Id', yaml: parentYaml },
        { id: 'child', originalId: 'Old_Export_Id', yaml: childYaml },
      ];

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({
          workflows: workflowsWithRefs,
          conflictIds: [],
        });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [{ workflows: sentWorkflows }] = mockWorkflowApi.bulkCreateWorkflows.mock.calls[0];

      const parentPayload = sentWorkflows.find((w: { id?: string; yaml: string }) =>
        w.yaml.includes('Parent')
      );

      expect(parentPayload).toBeDefined();
      // The legacy reference should be rewritten from 'Old_Export_Id' to 'child'
      expect(parentPayload!.yaml).toContain('workflow-id: child');
      expect(parentPayload!.yaml).not.toContain('workflow-id: Old_Export_Id');
    });
  });

  // ---------------------------------------------------------------------------
  // Import flow integration (preflight → import)
  // ---------------------------------------------------------------------------
  describe('preflight → import sequential flow', () => {
    it('should support a full preflight-then-import flow', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'yaml',
        totalWorkflows: 1,
        parseErrors: [],
        workflows: [
          {
            id: 'w-1',
            name: 'W',
            description: null,
            triggers: [],
            inputCount: 0,
            stepCount: 1,
            valid: true,
          },
        ],
        workflowIds: ['w-1'],
        rawWorkflows: [{ id: 'w-1', originalId: 'w-1', yaml: 'name: W' }],
      };
      const importResponse = {
        created: [{ id: 'w-1', name: 'W' } as WorkflowDetailDto],
        failed: [],
        parseErrors: [],
      };

      mockParseImportFile.mockResolvedValueOnce(clientResult);
      mockWorkflowApi.mgetWorkflows.mockResolvedValueOnce([]);
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importResponse);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });
      const file = createFile('flow.yml', 'name: W');

      act(() => {
        result.current.preflightImportWorkflows.mutate({ file });
      });
      await waitFor(() => expect(result.current.preflightImportWorkflows.isSuccess).toBe(true));
      expect(result.current.preflightImportWorkflows.data?.conflicts).toHaveLength(0);

      act(() => {
        result.current.importWorkflows.mutate({
          workflows: clientResult.rawWorkflows,
          conflictIds: [],
        });
      });
      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));
      expect(result.current.importWorkflows.data?.created).toHaveLength(1);

      expect(mockWorkflowApi.mgetWorkflows).toHaveBeenCalledTimes(1);
      expect(mockWorkflowApi.mgetWorkflows).toHaveBeenCalledWith({
        ids: ['w-1'],
        source: ['name'],
      });
      expect(mockWorkflowApi.bulkCreateWorkflows).toHaveBeenCalledTimes(1);
      expect(mockWorkflowApi.bulkCreateWorkflows).toHaveBeenCalledWith({
        workflows: expect.arrayContaining([
          expect.objectContaining({ id: 'w-1', yaml: 'name: W' }),
        ]),
        overwrite: undefined,
      });
    });

    it('should handle preflight with conflicts then import with overwrite', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'zip',
        totalWorkflows: 1,
        parseErrors: [],
        workflows: [
          {
            id: 'w-1',
            name: 'Existing Workflow',
            description: null,
            triggers: [],
            inputCount: 0,
            stepCount: 1,
            valid: true,
          },
        ],
        workflowIds: ['w-1'],
        rawWorkflows: [{ id: 'w-1', originalId: 'w-1', yaml: 'name: Existing Workflow' }],
      };
      const importResponse = {
        created: [{ id: 'w-1', name: 'Existing Workflow' } as WorkflowDetailDto],
        failed: [],
        parseErrors: [],
      };

      mockParseImportFile.mockResolvedValueOnce(clientResult);
      mockWorkflowApi.mgetWorkflows.mockResolvedValueOnce([
        { id: 'w-1', name: 'Existing Workflow' },
      ]);
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importResponse);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });
      const file = createFile('conflict.zip', 'zip');

      act(() => {
        result.current.preflightImportWorkflows.mutate({ file });
      });
      await waitFor(() => expect(result.current.preflightImportWorkflows.isSuccess).toBe(true));
      expect(result.current.preflightImportWorkflows.data?.conflicts).toHaveLength(1);

      act(() => {
        result.current.importWorkflows.mutate({
          workflows: clientResult.rawWorkflows,
          overwrite: true,
          conflictIds: [],
        });
      });
      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      expect(mockWorkflowApi.bulkCreateWorkflows).toHaveBeenCalledWith({
        workflows: expect.arrayContaining([
          expect.objectContaining({ id: 'w-1', yaml: 'name: Existing Workflow' }),
        ]),
        overwrite: true,
      });
    });

    it('should handle preflight success followed by import failure', async () => {
      const clientResult: ClientPreflightResult = {
        format: 'yaml',
        totalWorkflows: 1,
        parseErrors: [],
        workflows: [
          {
            id: 'w-1',
            name: 'W',
            description: null,
            triggers: [],
            inputCount: 0,
            stepCount: 1,
            valid: true,
          },
        ],
        workflowIds: ['w-1'],
        rawWorkflows: [{ id: 'w-1', originalId: 'w-1', yaml: 'name: W' }],
      };

      mockParseImportFile.mockResolvedValueOnce(clientResult);
      mockWorkflowApi.mgetWorkflows.mockResolvedValueOnce([]);
      mockWorkflowApi.bulkCreateWorkflows.mockRejectedValueOnce(new Error('Import failed'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });
      const file = createFile('fail.yml', 'name: W');

      act(() => {
        result.current.preflightImportWorkflows.mutate({ file });
      });
      await waitFor(() => expect(result.current.preflightImportWorkflows.isSuccess).toBe(true));

      act(() => {
        result.current.importWorkflows.mutate({
          workflows: clientResult.rawWorkflows,
          conflictIds: [],
        });
      });
      await waitFor(() => expect(result.current.importWorkflows.isError).toBe(true));

      expect(result.current.preflightImportWorkflows.isSuccess).toBe(true);
      expect(result.current.importWorkflows.isError).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // updateWorkflow
  // ---------------------------------------------------------------------------
  describe('updateWorkflow', () => {
    it('should call api.updateWorkflow with the workflow body', async () => {
      mockWorkflowApi.updateWorkflow.mockResolvedValueOnce(undefined as never);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
        });
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));

      expect(mockWorkflowApi.updateWorkflow).toHaveBeenCalledWith('wf-1', { enabled: true });
    });

    it('should optimistically update workflow list queries on mutate', async () => {
      const listData: WorkflowListDto = {
        results: [
          createMockWorkflowListItemDto({ id: 'wf-1', name: 'Workflow 1', enabled: false }),
        ],
        page: 1,
        size: 100,
        total: 1,
      };

      queryClient.setQueryData(['workflows', 'list'], listData);

      // Make the API call hang so we can inspect optimistic state
      let resolveApi: () => void;
      mockWorkflowApi.updateWorkflow.mockReturnValue(
        new Promise<never>((resolve) => {
          resolveApi = resolve as () => void;
        })
      );

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
        });
      });

      // After onMutate, optimistic update should have been applied
      await waitFor(() => {
        const updated = queryClient.getQueryData<WorkflowListDto>(['workflows', 'list']);
        expect(updated?.results[0].enabled).toBe(true);
      });

      // Resolve the API call
      act(() => {
        resolveApi!();
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));
    });

    it('should roll back optimistic update on error for non-YAML changes', async () => {
      const listData: WorkflowListDto = {
        results: [
          createMockWorkflowListItemDto({ id: 'wf-1', name: 'Workflow 1', enabled: false }),
        ],
        page: 1,
        size: 100,
        total: 1,
      };

      queryClient.setQueryData(['workflows', 'list'], listData);

      mockWorkflowApi.updateWorkflow.mockRejectedValueOnce(new Error('Server Error'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
        });
      });

      await waitFor(() => expect(result.current.updateWorkflow.isError).toBe(true));

      // Data should be rolled back
      const rolledBack = queryClient.getQueryData<WorkflowListDto>(['workflows', 'list']);
      expect(rolledBack?.results[0].enabled).toBe(false);
    });

    it('should report telemetry on success', async () => {
      mockWorkflowApi.updateWorkflow.mockResolvedValueOnce(undefined as never);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
        });
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));

      expect(mockTelemetry.reportWorkflowUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'wf-1',
          error: undefined,
        })
      );
    });

    it('should report telemetry on error', async () => {
      mockWorkflowApi.updateWorkflow.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: false },
        });
      });

      await waitFor(() => expect(result.current.updateWorkflow.isError).toBe(true));

      expect(mockTelemetry.reportWorkflowUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'wf-1',
          error: expect.any(Error),
        })
      );
    });

    it('should skip refetch when skipRefetch is true', async () => {
      mockWorkflowApi.updateWorkflow.mockResolvedValueOnce(undefined as never);
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
          skipRefetch: true,
        });
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ refetchType: 'none' }));

      invalidateSpy.mockRestore();
    });

    it('should include bulkActionCount in telemetry when provided', async () => {
      mockWorkflowApi.updateWorkflow.mockResolvedValueOnce(undefined as never);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
          isBulkAction: true,
          bulkActionCount: 5,
        });
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));

      expect(mockTelemetry.reportWorkflowUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          isBulkAction: true,
          bulkActionCount: 5,
        })
      );
    });

    it('should optimistically update workflow detail for non-YAML changes', async () => {
      const detailData = createMockWorkflowDetailDto({
        id: 'wf-1',
        name: 'Workflow 1',
        enabled: false,
        yaml: 'name: test',
      });

      queryClient.setQueryData(['workflows', 'wf-1'], detailData);

      let resolveApi: () => void;
      mockWorkflowApi.updateWorkflow.mockReturnValue(
        new Promise<never>((resolve) => {
          resolveApi = resolve as () => void;
        })
      );

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
        });
      });

      await waitFor(() => {
        const updated = queryClient.getQueryData<WorkflowDetailDto>(['workflows', 'wf-1']);
        expect(updated?.enabled).toBe(true);
      });

      act(() => {
        resolveApi!();
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));
    });

    it('should NOT optimistically update workflow detail for YAML changes', async () => {
      const detailData = createMockWorkflowDetailDto({
        id: 'wf-1',
        name: 'Workflow 1',
        yaml: 'name: old',
      });

      queryClient.setQueryData(['workflows', 'wf-1'], detailData);

      let resolveApi: () => void;
      mockWorkflowApi.updateWorkflow.mockReturnValue(
        new Promise<never>((resolve) => {
          resolveApi = resolve as () => void;
        })
      );

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { yaml: 'name: new' },
        });
      });

      // For YAML changes, the detail should NOT be optimistically updated
      await waitFor(() => {
        const current = queryClient.getQueryData<WorkflowDetailDto>(['workflows', 'wf-1']);
        expect(current?.yaml).toBe('name: old');
      });

      act(() => {
        resolveApi!();
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));
    });
  });

  // ---------------------------------------------------------------------------
  // deleteWorkflows
  // ---------------------------------------------------------------------------
  describe('deleteWorkflows', () => {
    it('should call api.bulkDeleteWorkflows with the IDs', async () => {
      mockWorkflowApi.bulkDeleteWorkflows.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.deleteWorkflows.mutate({ ids: ['wf-1', 'wf-2'] });
      });

      await waitFor(() => expect(result.current.deleteWorkflows.isSuccess).toBe(true));

      expect(mockWorkflowApi.bulkDeleteWorkflows).toHaveBeenCalledWith(['wf-1', 'wf-2']);
    });

    it('should optimistically remove workflows from list', async () => {
      const listData: WorkflowListDto = {
        results: [
          createMockWorkflowListItemDto({ id: 'wf-1', name: 'W1' }),
          createMockWorkflowListItemDto({ id: 'wf-2', name: 'W2' }),
          createMockWorkflowListItemDto({ id: 'wf-3', name: 'W3' }),
        ],
        page: 1,
        size: 100,
        total: 3,
      };

      queryClient.setQueryData(['workflows', 'list'], listData);

      let resolveApi: () => void;
      mockWorkflowApi.bulkDeleteWorkflows.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveApi = resolve;
        })
      );

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.deleteWorkflows.mutate({ ids: ['wf-1', 'wf-3'] });
      });

      await waitFor(() => {
        const updated = queryClient.getQueryData<WorkflowListDto>(['workflows', 'list']);
        expect(updated?.results).toHaveLength(1);
        expect(updated?.results[0].id).toBe('wf-2');
        expect(updated?.total).toBe(1);
      });

      act(() => {
        resolveApi!();
      });

      await waitFor(() => expect(result.current.deleteWorkflows.isSuccess).toBe(true));
    });

    it('should roll back on error', async () => {
      const listData: WorkflowListDto = {
        results: [createMockWorkflowListItemDto({ id: 'wf-1', name: 'W1' })],
        page: 1,
        size: 100,
        total: 1,
      };

      queryClient.setQueryData(['workflows', 'list'], listData);

      mockWorkflowApi.bulkDeleteWorkflows.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.deleteWorkflows.mutate({ ids: ['wf-1'] });
      });

      await waitFor(() => expect(result.current.deleteWorkflows.isError).toBe(true));

      const rolledBack = queryClient.getQueryData<WorkflowListDto>(['workflows', 'list']);
      expect(rolledBack?.results).toHaveLength(1);
      expect(rolledBack?.total).toBe(1);
    });

    it('should report telemetry on success for each deleted workflow', async () => {
      mockWorkflowApi.bulkDeleteWorkflows.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.deleteWorkflows.mutate({ ids: ['wf-1', 'wf-2'] });
      });

      await waitFor(() => expect(result.current.deleteWorkflows.isSuccess).toBe(true));

      expect(mockTelemetry.reportWorkflowDeleted).toHaveBeenCalledTimes(2);
      expect(mockTelemetry.reportWorkflowDeleted).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowIds: ['wf-1'],
          isBulkDelete: true,
          error: undefined,
        })
      );
    });

    it('should report telemetry on error for each workflow', async () => {
      mockWorkflowApi.bulkDeleteWorkflows.mockRejectedValueOnce(new Error('Fail'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.deleteWorkflows.mutate({ ids: ['wf-1'] });
      });

      await waitFor(() => expect(result.current.deleteWorkflows.isError).toBe(true));

      expect(mockTelemetry.reportWorkflowDeleted).toHaveBeenCalledWith(
        expect.objectContaining({
          isBulkDelete: false,
          error: expect.any(Error),
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // cloneWorkflow
  // ---------------------------------------------------------------------------
  describe('cloneWorkflow', () => {
    it('should call api.cloneWorkflow with the workflow id', async () => {
      const cloned = createMockWorkflowDetailDto({ id: 'wf-clone', name: 'Clone' });
      mockWorkflowApi.cloneWorkflow.mockResolvedValueOnce(cloned);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.cloneWorkflow.mutate({ id: 'wf-1' });
      });

      await waitFor(() => expect(result.current.cloneWorkflow.isSuccess).toBe(true));

      expect(mockWorkflowApi.cloneWorkflow).toHaveBeenCalledWith('wf-1');
      expect(result.current.cloneWorkflow.data).toEqual(cloned);
    });

    it('should report telemetry on success with source and new IDs', async () => {
      const cloned = createMockWorkflowDetailDto({ id: 'wf-clone', name: 'Clone' });
      mockWorkflowApi.cloneWorkflow.mockResolvedValueOnce(cloned);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.cloneWorkflow.mutate({ id: 'wf-1' });
      });

      await waitFor(() => expect(result.current.cloneWorkflow.isSuccess).toBe(true));

      expect(mockTelemetry.reportWorkflowCloned).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceWorkflowId: 'wf-1',
          newWorkflowId: 'wf-clone',
          error: undefined,
        })
      );
    });

    it('should report telemetry on error', async () => {
      mockWorkflowApi.cloneWorkflow.mockRejectedValueOnce(new Error('Clone failed'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.cloneWorkflow.mutate({ id: 'wf-1' });
      });

      await waitFor(() => expect(result.current.cloneWorkflow.isError).toBe(true));

      expect(mockTelemetry.reportWorkflowCloned).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceWorkflowId: 'wf-1',
          error: expect.any(Error),
        })
      );
    });

    it('should invalidate workflow queries on success', async () => {
      const cloned = createMockWorkflowDetailDto({ id: 'wf-clone', name: 'Clone' });
      mockWorkflowApi.cloneWorkflow.mockResolvedValueOnce(cloned);
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.cloneWorkflow.mutate({ id: 'wf-1' });
      });

      await waitFor(() => expect(result.current.cloneWorkflow.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['workflows'] })
      );

      invalidateSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // runIndividualStep
  // ---------------------------------------------------------------------------
  describe('runIndividualStep', () => {
    it('should call api.testStep with the step params', async () => {
      const response = { workflowExecutionId: 'exec-1' };
      mockWorkflowApi.testStep.mockResolvedValueOnce(response as never);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.runIndividualStep.mutate({
          stepId: 'step-1',
          workflowId: 'wf-1',
          workflowYaml: 'name: test',
          contextOverride: { key: 'value' },
        });
      });

      await waitFor(() => expect(result.current.runIndividualStep.isSuccess).toBe(true));

      expect(mockWorkflowApi.testStep).toHaveBeenCalledWith({
        stepId: 'step-1',
        workflowId: 'wf-1',
        workflowYaml: 'name: test',
        contextOverride: { key: 'value' },
      });
    });

    it('should report telemetry on success', async () => {
      const response = { workflowExecutionId: 'exec-1' };
      mockWorkflowApi.testStep.mockResolvedValueOnce(response as never);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.runIndividualStep.mutate({
          stepId: 'step-1',
          workflowId: 'wf-1',
          workflowYaml: 'name: test',
          contextOverride: {},
        });
      });

      await waitFor(() => expect(result.current.runIndividualStep.isSuccess).toBe(true));

      expect(mockTelemetry.reportWorkflowStepTestRunInitiated).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'step-1',
          error: undefined,
        })
      );
    });

    it('should report telemetry on error', async () => {
      mockWorkflowApi.testStep.mockRejectedValueOnce(new Error('Step failed'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.runIndividualStep.mutate({
          stepId: 'step-1',
          workflowId: 'wf-1',
          workflowYaml: 'name: test',
          contextOverride: {},
        });
      });

      await waitFor(() => expect(result.current.runIndividualStep.isError).toBe(true));

      expect(mockTelemetry.reportWorkflowStepTestRunInitiated).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'step-1',
          error: expect.any(Error),
        })
      );
    });
  });
});
