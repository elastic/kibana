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
import { useWorkflowActions } from './use_workflow_actions';
import { parseImportFile } from '../../../features/import_workflows/lib/parse_import_file';
import type { ClientPreflightResult } from '../../../features/import_workflows/lib/parse_import_file';
import { useKibana } from '../../../hooks/use_kibana';
import { useTelemetry } from '../../../hooks/use_telemetry';

const mockParseImportFile = parseImportFile as jest.MockedFunction<typeof parseImportFile>;

jest.mock('../../../features/import_workflows/lib/parse_import_file');
jest.mock('../../../hooks/use_kibana');
jest.mock('../../../hooks/use_telemetry');
jest.mock('@kbn/workflows-ui', () => ({
  useRunWorkflow: () => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isLoading: false,
    data: undefined,
    error: null,
    reset: jest.fn(),
  }),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
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
  let mockHttp: {
    post: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
  };
  let mockTelemetry: Record<string, jest.Mock>;
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttp = {
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    mockTelemetry = {
      reportWorkflowUpdated: jest.fn(),
      reportWorkflowDeleted: jest.fn(),
      reportWorkflowCloned: jest.fn(),
      reportWorkflowRunInitiated: jest.fn(),
      reportWorkflowStepTestRunInitiated: jest.fn(),
    };

    mockUseKibana.mockReturnValue({ services: { http: mockHttp } } as any);
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

    it('should parse the file client-side and check conflicts via _check-conflicts', async () => {
      mockParseImportFile.mockResolvedValueOnce(clientParseResult);
      mockHttp.post.mockResolvedValueOnce({ conflicts: [] });

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });
      const file = createFile('test.yml', 'name: Test');

      act(() => {
        result.current.preflightImportWorkflows.mutate({ file });
      });

      await waitFor(() => expect(result.current.preflightImportWorkflows.isSuccess).toBe(true));

      expect(mockParseImportFile).toHaveBeenCalledWith(file);
      expect(mockHttp.post).toHaveBeenCalledTimes(1);
      expect(mockHttp.post).toHaveBeenCalledWith('/api/workflows/_check-conflicts', {
        body: JSON.stringify({ ids: ['w-1'] }),
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
      mockHttp.post.mockResolvedValueOnce({
        conflicts: [{ id: 'w-1', existingName: 'Existing' }],
      });

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

      expect(mockHttp.post).not.toHaveBeenCalled();
      expect(result.current.preflightImportWorkflows.data?.conflicts).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // importWorkflows
  // ---------------------------------------------------------------------------
  describe('importWorkflows', () => {
    const workflows = [{ id: 'w-1', yaml: 'name: Test' }];
    const importSuccess = {
      created: [{ id: 'w-1', name: 'W1' }],
      failed: [],
      parseErrors: [],
    };

    it('should POST JSON to /api/workflows/_bulk_create with no query params by default', async () => {
      mockHttp.post.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [url, options] = mockHttp.post.mock.calls[0];
      expect(url).toBe('/api/workflows/_bulk_create');
      expect(JSON.parse(options.body)).toEqual({ workflows });
      expect(options.query).toEqual({});
    });

    it('should send overwrite=true in query when overwrite is true', async () => {
      mockHttp.post.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows, overwrite: true });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [, options] = mockHttp.post.mock.calls[0];
      expect(options.query).toEqual({ overwrite: true });
    });

    it('should generate new IDs client-side when generateNewIds is true', async () => {
      mockHttp.post.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows, generateNewIds: true });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [, options] = mockHttp.post.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.workflows).toHaveLength(1);
      expect(body.workflows[0].id).toMatch(/^workflow-/);
      expect(body.workflows[0].id).not.toBe('w-1');
      expect(options.query).toEqual({});
    });

    it('should generate new IDs and send overwrite when both flags are true', async () => {
      mockHttp.post.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({
          workflows,
          overwrite: true,
          generateNewIds: true,
        });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [, options] = mockHttp.post.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.workflows[0].id).toMatch(/^workflow-/);
      expect(options.query).toEqual({ overwrite: true });
    });

    it('should omit falsy flags from query params', async () => {
      mockHttp.post.mockResolvedValueOnce(importSuccess);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({
          workflows,
          overwrite: false,
          generateNewIds: false,
        });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));

      const [, options] = mockHttp.post.mock.calls[0];
      expect(options.query).toEqual({});
    });

    it('should invalidate workflows queries on success', async () => {
      mockHttp.post.mockResolvedValueOnce(importSuccess);
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
      mockHttp.post.mockRejectedValueOnce(new Error('Server error'));
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
        ],
        failed: [{ index: 2, error: 'invalid yaml' }],
        parseErrors: ['readme.txt is not a .yml file'],
      };
      mockHttp.post.mockResolvedValueOnce(response);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows });
      });

      await waitFor(() => expect(result.current.importWorkflows.isSuccess).toBe(true));
      expect(result.current.importWorkflows.data).toEqual(response);
    });

    it('should surface HTTP errors', async () => {
      const httpError = Object.assign(new Error('500 Internal Server Error'), {
        body: { statusCode: 500, message: 'Internal Server Error' },
      });
      mockHttp.post.mockRejectedValueOnce(httpError);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.importWorkflows.mutate({ workflows });
      });

      await waitFor(() => expect(result.current.importWorkflows.isError).toBe(true));
      expect(result.current.importWorkflows.error).toBe(httpError);
    });

    it('should be resettable after an error', async () => {
      mockHttp.post.mockRejectedValueOnce(new Error('fail'));

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
      const firstResponse = { created: [{ id: 'w-1' }], failed: [], parseErrors: [] };
      const secondResponse = { created: [{ id: 'w-2' }], failed: [], parseErrors: [] };
      mockHttp.post.mockResolvedValueOnce(firstResponse).mockResolvedValueOnce(secondResponse);

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

      expect(mockHttp.post).toHaveBeenCalledTimes(2);
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
      const importResponse = { created: [{ id: 'w-1', name: 'W' }], failed: [], parseErrors: [] };

      mockParseImportFile.mockResolvedValueOnce(clientResult);
      mockHttp.post.mockResolvedValueOnce({ conflicts: [] }).mockResolvedValueOnce(importResponse);

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

      expect(mockHttp.post).toHaveBeenCalledTimes(2);
      expect(mockHttp.post.mock.calls[0][0]).toBe('/api/workflows/_check-conflicts');
      expect(mockHttp.post.mock.calls[1][0]).toBe('/api/workflows/_bulk_create');
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
        created: [{ id: 'w-1', name: 'Existing Workflow' }],
        failed: [],
        parseErrors: [],
      };

      mockParseImportFile.mockResolvedValueOnce(clientResult);
      mockHttp.post
        .mockResolvedValueOnce({
          conflicts: [{ id: 'w-1', existingName: 'Existing Workflow' }],
        })
        .mockResolvedValueOnce(importResponse);

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

      const [, importOptions] = mockHttp.post.mock.calls[1];
      expect(importOptions.query).toEqual({ overwrite: true });
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
      mockHttp.post
        .mockResolvedValueOnce({ conflicts: [] })
        .mockRejectedValueOnce(new Error('Import failed'));

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
