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

const makeSecurityMock = (username: string = 'alice') =>
  ({
    authc: {
      getCurrentUser: jest.fn().mockReturnValue({ username }),
    },
  } as any);

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
    getSecurity: () => makeSecurityMock('alice'),
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

    it('returns only the fields present on the narrowed _source (no fabricated undefineds)', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'wf-1',
              _source: { name: 'only-name' },
            },
          ],
        },
      });

      const service = new WorkflowCrudService(deps);
      const result = await service.getWorkflowsSourceByIds(['wf-1'], 'default', ['name']);

      expect(result).toEqual([{ id: 'wf-1', name: 'only-name' }]);
      expect('yaml' in result[0]).toBe(false);
      expect('definition' in result[0]).toBe(false);
      expect('enabled' in result[0]).toBe(false);
    });
  });

  describe('createWorkflow', () => {
    const validYaml = [
      'name: My Workflow',
      'enabled: true',
      'triggers:',
      '  - type: manual',
      'steps:',
      '  - name: step-one',
      '    type: console',
      '    with:',
      '      message: "hi"',
    ].join('\n');

    const request = { auth: { credentials: { username: 'alice' } } } as any;

    it('validates the workflow id format before touching storage', async () => {
      const { deps, client } = makeDeps();
      const service = new WorkflowCrudService(deps);

      await expect(
        service.createWorkflow({ id: 'Invalid ID!', yaml: validYaml }, 'default', request)
      ).rejects.toThrow();
      expect(client.index).not.toHaveBeenCalled();
    });

    it('indexes a new workflow and returns the resulting DTO', async () => {
      const { deps, client } = makeDeps();
      // No existing workflow for the generated id.
      client.search.mockResolvedValue({ hits: { hits: [] } });

      const service = new WorkflowCrudService(deps);
      const result = await service.createWorkflow({ yaml: validYaml }, 'default', request);

      expect(result.name).toBe('My Workflow');
      expect(client.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          refresh: true,
          document: expect.objectContaining({
            name: 'My Workflow',
            spaceId: 'default',
          }),
        })
      );
    });

    it('throws WorkflowConflictError when a user-supplied id matches an existing workflow (including tombstones)', async () => {
      const { deps, client } = makeDeps();
      // First search (dup-check via getWorkflow with includeDeleted:true) returns a hit.
      client.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'dup-id', _source: makeSource({ name: 'existing' }) }],
        },
      });

      const service = new WorkflowCrudService(deps);
      await expect(
        service.createWorkflow({ id: 'dup-id', yaml: validYaml }, 'default', request)
      ).rejects.toThrow(/already exists/);
      expect(client.index).not.toHaveBeenCalled();

      // Dup-check must include tombstones — otherwise the facade would silently allow id reuse
      // against soft-deleted workflows.
      const searchArgs = client.search.mock.calls[0][0];
      expect(searchArgs.query.bool.must_not ?? []).not.toContainEqual({
        exists: { field: 'deleted_at' },
      });
    });
  });

  describe('bulkCreateWorkflows', () => {
    const validYaml = (name: string) =>
      [
        `name: ${name}`,
        'enabled: true',
        'triggers:',
        '  - type: manual',
        'steps:',
        '  - name: step',
        '    type: console',
        '    with:',
        '      message: "m"',
      ].join('\n');

    const request = { auth: { credentials: { username: 'alice' } } } as any;

    it('returns empty result for an empty workflow list and does not call bulk', async () => {
      const { deps, client } = makeDeps();
      const service = new WorkflowCrudService(deps);

      const result = await service.bulkCreateWorkflows([], 'default', request);

      expect(result).toEqual({ created: [], failed: [] });
      expect(client.bulk).not.toHaveBeenCalled();
    });

    it('maps per-item bulk failures to the failed list while still returning successes', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({ hits: { hits: [] } });
      client.bulk.mockResolvedValue({
        items: [
          { create: { _id: 'id-a', status: 201 } },
          {
            create: {
              _id: 'id-b',
              status: 409,
              error: { type: 'version_conflict_engine_exception', reason: 'exists' },
            },
          },
        ],
      });

      const service = new WorkflowCrudService(deps);
      const result = await service.bulkCreateWorkflows(
        [{ yaml: validYaml('A') }, { yaml: validYaml('B') }],
        'default',
        request
      );

      expect(result.created).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toMatch(/exists/);
    });

    it('uses index (overwrite) vs create (no overwrite) based on the option flag', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({ hits: { hits: [] } });
      client.bulk.mockResolvedValue({
        items: [{ index: { _id: 'id-a', status: 200 } }],
      });

      const service = new WorkflowCrudService(deps);
      await service.bulkCreateWorkflows([{ yaml: validYaml('A') }], 'default', request, {
        overwrite: true,
      });

      const ops = client.bulk.mock.calls[0][0].operations;
      expect(ops[0]).toHaveProperty('index');
      expect(ops[0]).not.toHaveProperty('create');

      client.bulk.mockClear();
      client.bulk.mockResolvedValue({
        items: [{ create: { _id: 'id-b', status: 201 } }],
      });
      await service.bulkCreateWorkflows([{ yaml: validYaml('B') }], 'default', request);
      const opsNoOverwrite = client.bulk.mock.calls[0][0].operations;
      expect(opsNoOverwrite[0]).toHaveProperty('create');
      expect(opsNoOverwrite[0]).not.toHaveProperty('index');
    });

    it('rejects a user-supplied id that collides with an existing workflow when overwrite=false', async () => {
      const { deps, client } = makeDeps();
      // Initial dup-check search during resolveAndDeduplicateBulkIds.
      client.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'taken-id', _source: makeSource() }],
        },
      });

      const service = new WorkflowCrudService(deps);
      const result = await service.bulkCreateWorkflows(
        [{ id: 'taken-id', yaml: validYaml('taken') }],
        'default',
        request
      );

      expect(result.created).toEqual([]);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].id).toBe('taken-id');
      // bulk must not be issued when every valid entry has been filtered out.
      expect(client.bulk).not.toHaveBeenCalled();
    });

    it('dedupes duplicate user-supplied ids within the same batch (first one wins)', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({ hits: { hits: [] } });
      client.bulk.mockResolvedValue({
        items: [{ create: { _id: 'same', status: 201 } }],
      });

      const service = new WorkflowCrudService(deps);
      const result = await service.bulkCreateWorkflows(
        [
          { id: 'same', yaml: validYaml('one') },
          { id: 'same', yaml: validYaml('two') },
        ],
        'default',
        request
      );

      expect(result.created).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].id).toBe('same');
    });

    const makeTaskScheduler = () => ({
      scheduleWorkflowTasks: jest.fn().mockResolvedValue([]),
      scheduleWorkflowTask: jest.fn().mockResolvedValue('task-id'),
      unscheduleWorkflowTasks: jest.fn().mockResolvedValue(undefined),
      updateWorkflowTasks: jest.fn().mockResolvedValue(undefined),
    });

    it('overwrite=true unschedules orphaned tasks when the new workflow has no scheduled triggers', async () => {
      const taskScheduler = makeTaskScheduler();
      const { deps, client } = makeDeps();
      (deps as any).getTaskScheduler = () => taskScheduler;

      client.bulk.mockResolvedValue({ items: [{ index: { _id: 'wf-1', status: 200 } }] });
      // Post-write re-read: persisted document has only a manual trigger.
      client.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'wf-1',
              _source: makeSource({
                enabled: true,
                valid: true,
                definition: {
                  name: 'A',
                  enabled: true,
                  triggers: [{ type: 'manual' }],
                  steps: [],
                } as any,
              }),
            },
          ],
        },
      });

      const service = new WorkflowCrudService(deps);
      await service.bulkCreateWorkflows(
        [{ id: 'wf-1', yaml: validYaml('A') }],
        'default',
        request,
        { overwrite: true }
      );

      expect(taskScheduler.unscheduleWorkflowTasks).toHaveBeenCalledWith('wf-1');
      expect(taskScheduler.updateWorkflowTasks).not.toHaveBeenCalled();
    });

    it('overwrite=true reschedules in place when the persisted workflow still has a scheduled trigger', async () => {
      const taskScheduler = makeTaskScheduler();
      const { deps, client } = makeDeps();
      (deps as any).getTaskScheduler = () => taskScheduler;

      client.bulk.mockResolvedValue({ items: [{ index: { _id: 'wf-1', status: 200 } }] });
      client.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'wf-1',
              _source: makeSource({
                enabled: true,
                valid: true,
                definition: {
                  name: 'A',
                  enabled: true,
                  triggers: [{ type: 'scheduled', with: { every: '5m' } }],
                  steps: [],
                } as any,
              }),
            },
          ],
        },
      });

      const service = new WorkflowCrudService(deps);
      await service.bulkCreateWorkflows(
        [{ id: 'wf-1', yaml: validYaml('A') }],
        'default',
        request,
        { overwrite: true }
      );

      expect(taskScheduler.updateWorkflowTasks).toHaveBeenCalledTimes(1);
      expect(taskScheduler.updateWorkflowTasks).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'wf-1' }),
        'default',
        request
      );
      expect(taskScheduler.unscheduleWorkflowTasks).not.toHaveBeenCalled();
    });

    it('overwrite=true unschedules when the persisted workflow has scheduled triggers but is disabled', async () => {
      const taskScheduler = makeTaskScheduler();
      const { deps, client } = makeDeps();
      (deps as any).getTaskScheduler = () => taskScheduler;

      client.bulk.mockResolvedValue({ items: [{ index: { _id: 'wf-1', status: 200 } }] });
      client.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'wf-1',
              _source: makeSource({
                enabled: false,
                valid: true,
                definition: {
                  name: 'A',
                  enabled: false,
                  triggers: [{ type: 'scheduled', with: { every: '5m' } }],
                  steps: [],
                } as any,
              }),
            },
          ],
        },
      });

      const service = new WorkflowCrudService(deps);
      await service.bulkCreateWorkflows(
        [{ id: 'wf-1', yaml: validYaml('A') }],
        'default',
        request,
        { overwrite: true }
      );

      expect(taskScheduler.unscheduleWorkflowTasks).toHaveBeenCalledWith('wf-1');
      expect(taskScheduler.updateWorkflowTasks).not.toHaveBeenCalled();
    });

    it('overwrite=false keeps the additive schedule path and never issues a post-write re-read', async () => {
      const taskScheduler = makeTaskScheduler();
      const { deps, client } = makeDeps();
      (deps as any).getTaskScheduler = () => taskScheduler;

      client.search.mockResolvedValue({ hits: { hits: [] } });
      client.bulk.mockResolvedValue({ items: [{ create: { _id: 'gen-id', status: 201 } }] });

      const service = new WorkflowCrudService(deps);
      await service.bulkCreateWorkflows([{ yaml: validYaml('A') }], 'default', request);

      expect(taskScheduler.updateWorkflowTasks).not.toHaveBeenCalled();
      expect(taskScheduler.unscheduleWorkflowTasks).not.toHaveBeenCalled();
      expect(taskScheduler.scheduleWorkflowTask).not.toHaveBeenCalled();
      // Only the ID-resolution search runs — no post-write re-read for `syncSchedulerAfterSave`.
      expect(client.search).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateWorkflow', () => {
    const request = { auth: { credentials: { username: 'alice' } } } as any;

    it('throws when the workflow does not exist', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({ hits: { hits: [] } });

      const service = new WorkflowCrudService(deps);
      await expect(
        service.updateWorkflow('missing', { enabled: false }, 'default', request)
      ).rejects.toThrow(/not found/);
      expect(client.index).not.toHaveBeenCalled();
    });

    it('patches fields and indexes the merged document', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'wf-1',
              _source: makeSource({ name: 'Before', enabled: true, tags: ['t1'] }),
            },
          ],
        },
      });

      const service = new WorkflowCrudService(deps);
      const result = await service.updateWorkflow(
        'wf-1',
        { tags: ['t1', 't2'] } as any,
        'default',
        request
      );

      expect(result.id).toBe('wf-1');
      expect(client.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wf-1',
          refresh: true,
          document: expect.objectContaining({
            tags: ['t1', 't2'],
            lastUpdatedBy: 'alice',
          }),
        })
      );
    });

    it('records the caller in lastUpdatedBy on every update', async () => {
      const { deps, client } = makeDeps();
      client.search.mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'wf-1',
              _source: makeSource({ lastUpdatedBy: 'someone-else' }),
            },
          ],
        },
      });

      const service = new WorkflowCrudService(deps);
      await service.updateWorkflow('wf-1', { tags: ['new'] } as any, 'default', request);

      expect(client.index.mock.calls[0][0].document.lastUpdatedBy).toBe('alice');
    });
  });
});
