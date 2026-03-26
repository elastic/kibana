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
import type { WorkflowDetailDto } from '@kbn/workflows';
import { createMockWorkflowApi } from '@kbn/workflows-ui/src/api/workflows_api.mock';
import { useWorkflowActions } from './use_workflow_actions';
import { parseImportFile } from '../../../features/import_workflows/lib/parse_import_file';
import type { ClientPreflightResult } from '../../../features/import_workflows/lib/parse_import_file';
import { useTelemetry } from '../../../hooks/use_telemetry';

const mockParseImportFile = parseImportFile as jest.MockedFunction<typeof parseImportFile>;

jest.mock('../../../features/import_workflows/lib/parse_import_file');
jest.mock('../../../hooks/use_telemetry');

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

    mockUseTelemetry.mockReturnValue(mockTelemetry as any);

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
      rawWorkflows: [{ id: 'w-1', yaml: 'name: W1' }],
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
          { id: 'w-1', yaml: 'name: Existing' },
          { id: 'w-2', yaml: 'name: New' },
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
    const workflows = [{ id: 'w-1', yaml: 'name: Test' }];
    const importSuccess = { created: [{ id: 'w-1', name: 'W1' } as WorkflowDetailDto], failed: [] };

    it('should call bulkCreateWorkflows with workflows and default overwrite when not specified', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      expect(mockWorkflowApi.bulkCreateWorkflows).toHaveBeenCalledWith({
        workflows,
        overwrite: undefined,
      });
    });

    it('should pass overwrite true to bulkCreateWorkflows when overwrite is true', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows, overwrite: true });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      expect(mockWorkflowApi.bulkCreateWorkflows).toHaveBeenCalledWith({
        workflows,
        overwrite: true,
      });
    });

    it('should generate new IDs client-side when generateNewIds is true', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows, generateNewIds: true });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [{ workflows: sentWorkflows, overwrite }] =
        mockWorkflowApi.bulkCreateWorkflows.mock.calls[0];
      expect(sentWorkflows).toHaveLength(1);
      expect(sentWorkflows[0].id).toMatch(/^workflow-/);
      expect(sentWorkflows[0].id).not.toBe('w-1');
      expect(overwrite).toBeUndefined();
    });

    it('should generate new IDs and send overwrite when both flags are true', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({
          workflows,
          overwrite: true,
          generateNewIds: true,
        });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [{ workflows: sentWorkflows, overwrite }] =
        mockWorkflowApi.bulkCreateWorkflows.mock.calls[0];
      expect(sentWorkflows[0].id).toMatch(/^workflow-/);
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
        });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      expect(mockWorkflowApi.bulkCreateWorkflows).toHaveBeenCalledWith({
        workflows,
        overwrite: false,
      });
    });

    it('should invalidate workflows queries on success', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockResolvedValueOnce(importSuccess);
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows });
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
        result.current.importWorkflows.mutate({ workflows });
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
        result.current.importWorkflows.mutate({ workflows });
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
        result.current.importWorkflows.mutate({ workflows });
      });

      await waitFor(() => expect(result.current.importWorkflows.isError).toBe(true));
      expect(result.current.importWorkflows.error).toBe(httpError);
    });

    it('should be resettable after an error', async () => {
      mockWorkflowApi.bulkCreateWorkflows.mockRejectedValueOnce(new Error('fail'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows });
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
        result.current.importWorkflows.mutate({ workflows });
      });
      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));
      expect(result.current.importWorkflows.data).toEqual(firstResponse);

      act(() => {
        result.current.importWorkflows.mutate({
          workflows: [{ id: 'w-2', yaml: 'name: Second' }],
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

      const workflowsWithRefs: { id: string; yaml: string }[] = [
        { id: 'parent-1', yaml: parentYaml },
        { id: 'child-1', yaml: childYaml },
      ];

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({
          workflows: workflowsWithRefs,
          generateNewIds: true,
        });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [{ workflows: sentWorkflows }] = mockWorkflowApi.bulkCreateWorkflows.mock.calls[0];

      // Both workflows should have new IDs
      const parentPayload = sentWorkflows.find(
        (w: { id?: string; yaml: string }) => w.id !== 'parent-1' && w.yaml.includes('Parent')
      );
      const childPayload = sentWorkflows.find(
        (w: { id?: string; yaml: string }) => w.id !== 'child-1' && w.yaml.includes('Child')
      );

      expect(parentPayload).toBeDefined();
      expect(childPayload).toBeDefined();

      // The parent's YAML should reference the child's NEW id, not 'child-1'
      expect(parentPayload!.yaml).toContain(childPayload!.id);
      expect(parentPayload!.yaml).not.toContain('workflow-id: child-1');
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
        rawWorkflows: [{ id: 'w-1', yaml: 'name: W' }],
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
        result.current.importWorkflows.mutate({ workflows: clientResult.rawWorkflows });
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
        workflows: clientResult.rawWorkflows,
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
        rawWorkflows: [{ id: 'w-1', yaml: 'name: Existing Workflow' }],
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
        });
      });
      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      expect(mockWorkflowApi.bulkCreateWorkflows).toHaveBeenCalledWith({
        workflows: clientResult.rawWorkflows,
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
        rawWorkflows: [{ id: 'w-1', yaml: 'name: W' }],
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
        result.current.importWorkflows.mutate({ workflows: clientResult.rawWorkflows });
      });
      await waitFor(() => expect(result.current.importWorkflows.isError).toBe(true));

      expect(result.current.preflightImportWorkflows.isSuccess).toBe(true);
      expect(result.current.importWorkflows.isError).toBe(true);
    });
  });
});
