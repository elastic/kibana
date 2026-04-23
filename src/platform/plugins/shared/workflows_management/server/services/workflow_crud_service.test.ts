/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { WorkflowCrudDeps } from './types';
import { WorkflowCrudService } from './workflow_crud_service';
import type { WorkflowExecutionQueryService } from './workflow_execution_query_service';
import type { WorkflowValidationService } from './workflow_validation_service';
import type { WorkflowProperties } from '../storage/workflow_storage';

const makeSource = (overrides?: Partial<WorkflowProperties>): WorkflowProperties => ({
  name: 'Test Workflow',
  description: 'A test workflow',
  enabled: true,
  tags: [],
  triggerTypes: [],
  yaml: 'name: Test Workflow',
  definition: null,
  createdBy: 'user-1',
  lastUpdatedBy: 'user-1',
  spaceId: 'default',
  valid: true,
  deleted_at: null,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const makeStorageClient = () => ({
  search: jest.fn(),
  index: jest.fn().mockResolvedValue({ result: 'created' }),
  bulk: jest.fn(),
});

const makeDeps = (
  clientOverrides?: Partial<ReturnType<typeof makeStorageClient>>
): { deps: WorkflowCrudDeps; client: ReturnType<typeof makeStorageClient> } => {
  const client = { ...makeStorageClient(), ...clientOverrides };
  const executionQueryService = {
    getWorkflowExecutions: jest.fn().mockResolvedValue({ total: 0, results: [] }),
  } as unknown as WorkflowExecutionQueryService;
  const validationService = {
    getWorkflowZodSchema: jest.fn().mockResolvedValue({
      parse: (v: unknown) => v,
      safeParse: (v: unknown) => ({ success: true, data: v }),
    }),
  } as unknown as WorkflowValidationService;
  const deps: WorkflowCrudDeps = {
    logger: loggerMock.create(),
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
    workflowStorage: { getClient: () => client } as any,
    getSecurity: () => undefined,
    workflowsExtensions: undefined,
    getTaskScheduler: () => null,
    executionQueryService,
    validationService,
  };
  return { deps, client };
};

describe('WorkflowCrudService', () => {
  describe('getWorkflow', () => {
    it('returns WorkflowDetailDto for existing workflow', async () => {
      const source = makeSource();
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({
        hits: { hits: [{ _id: 'wf-1', _source: source }] },
      });

      const service = new WorkflowCrudService(deps);
      const result = await service.getWorkflow('wf-1', 'default');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('wf-1');
      expect(result?.name).toBe('Test Workflow');
      expect(result?.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('returns null when no hits returned', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({ hits: { hits: [] } });

      const service = new WorkflowCrudService(deps);
      const result = await service.getWorkflow('wf-missing', 'default');

      expect(result).toBeNull();
    });

    it('returns null on 404 error', async () => {
      const { deps, client } = makeDeps();
      const notFoundError = new errors.ResponseError({
        statusCode: 404,
        body: { error: { type: 'index_not_found_exception' } },
        headers: {},
        warnings: [],
        meta: {} as any,
      });
      client.search.mockRejectedValue(notFoundError);

      const service = new WorkflowCrudService(deps);
      const result = await service.getWorkflow('wf-1', 'default');

      expect(result).toBeNull();
    });

    it('re-throws non-404 errors', async () => {
      const { deps, client } = makeDeps();
      const serverError = new Error('internal server error');
      client.search.mockRejectedValue(serverError);

      const service = new WorkflowCrudService(deps);

      await expect(service.getWorkflow('wf-1', 'default')).rejects.toThrow('internal server error');
    });

    it('excludes soft-deleted workflows by default', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({ hits: { hits: [] } });

      const service = new WorkflowCrudService(deps);
      await service.getWorkflow('wf-1', 'default');

      const query = client.search.mock.calls[0][0].query.bool;
      expect(query.must_not).toContainEqual({ exists: { field: 'deleted_at' } });
    });

    it('includes soft-deleted workflows when opted in', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({ hits: { hits: [] } });

      const service = new WorkflowCrudService(deps);
      await service.getWorkflow('wf-1', 'default', { includeDeleted: true });

      const query = client.search.mock.calls[0][0].query.bool;
      expect(query.must_not ?? []).not.toContainEqual({ exists: { field: 'deleted_at' } });
    });
  });

  describe('getWorkflowsByIds', () => {
    it('returns empty array for empty ids without querying storage', async () => {
      const { deps, client } = makeDeps();

      const service = new WorkflowCrudService(deps);
      const result = await service.getWorkflowsByIds([], 'default');

      expect(result).toEqual([]);
      expect(client.search).not.toHaveBeenCalled();
    });

    it('maps hits to WorkflowDetailDto array', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({
        hits: {
          hits: [
            { _id: 'wf-1', _source: makeSource({ name: 'First' }) },
            { _id: 'wf-2', _source: makeSource({ name: 'Second' }) },
          ],
        },
      });

      const service = new WorkflowCrudService(deps);
      const result = await service.getWorkflowsByIds(['wf-1', 'wf-2'], 'default');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('wf-1');
      expect(result[0].name).toBe('First');
      expect(result[1].id).toBe('wf-2');
      expect(result[1].name).toBe('Second');
    });

    it('passes ids as terms query and sets size to ids length', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({ hits: { hits: [] } });

      const service = new WorkflowCrudService(deps);
      await service.getWorkflowsByIds(['wf-1', 'wf-2', 'wf-3'], 'default');

      const searchCall = client.search.mock.calls[0][0];
      expect(searchCall.size).toBe(3);
      expect(searchCall.track_total_hits).toBe(false);
      expect(searchCall.query.bool.must).toContainEqual({
        ids: { values: ['wf-1', 'wf-2', 'wf-3'] },
      });
    });
  });

  describe('getWorkflowsSourceByIds', () => {
    it('returns empty array for empty ids without querying storage', async () => {
      const { deps, client } = makeDeps();

      const service = new WorkflowCrudService(deps);
      const result = await service.getWorkflowsSourceByIds([], 'default');

      expect(result).toEqual([]);
      expect(client.search).not.toHaveBeenCalled();
    });

    it('passes custom source fields when provided', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({ hits: { hits: [] } });

      const service = new WorkflowCrudService(deps);
      await service.getWorkflowsSourceByIds(['wf-1'], 'default', ['name', 'yaml']);

      const searchCall = client.search.mock.calls[0][0];
      expect(searchCall._source).toEqual(['name', 'yaml']);
    });

    it('uses _source: true when no source fields specified', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({ hits: { hits: [] } });

      const service = new WorkflowCrudService(deps);
      await service.getWorkflowsSourceByIds(['wf-1'], 'default');

      const searchCall = client.search.mock.calls[0][0];
      expect(searchCall._source).toBe(true);
    });
  });
});
