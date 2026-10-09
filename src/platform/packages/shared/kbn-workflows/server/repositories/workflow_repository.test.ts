/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { WorkflowRepository } from './workflow_repository';
import { GLOBAL_WORKFLOW_SPACE_ID, WORKFLOW_INDEX_NAME } from '../constants';

describe('stored workflow ACLs', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const repository = new WorkflowRepository({
    esClient,
    logger: loggingSystemMock.create().get(),
  });
  const entry = {
    type: 'user',
    id: 'reader',
    role: 'viewer',
    added_at: '2026-09-17T00:00:00.000Z',
  };

  it.each([
    { timed_out: true, failed: 0 },
    { timed_out: false, failed: 1 },
  ])('rejects incomplete single and bulk reads: %j', async ({ timed_out, failed }) => {
    esClient.search.mockResolvedValue({
      took: 1,
      timed_out,
      _shards: { total: 1, successful: 1 - failed, failed },
      hits: { hits: [] },
    });

    await expect(repository.getWorkflow('workflow', 'default')).rejects.toThrow(
      'Could not load workflow access from incomplete search results.'
    );
    await expect(
      repository.getWorkflowExecutionStates([{ workflowId: 'workflow', spaceId: 'default' }])
    ).rejects.toThrow('Could not load workflow access from incomplete search results.');
  });

  it.each([
    { name: 'null', acl: null },
    { name: 'false', acl: false },
    { name: 'missing mode', acl: { entries: [] } },
    { name: 'invalid mode', acl: { access_mode: 'privte', entries: [] } },
    { name: 'missing entries', acl: { access_mode: 'private' } },
    { name: 'non-array entries', acl: { access_mode: 'private', entries: {} } },
    {
      name: 'invalid role',
      acl: { access_mode: 'private', entries: [{ ...entry, role: 'owner' }] },
    },
    {
      name: 'missing timestamp',
      acl: { access_mode: 'private', entries: [{ type: 'user', id: 'reader', role: 'viewer' }] },
    },
    {
      name: 'too many entries',
      acl: { access_mode: 'private', entries: Array.from({ length: 101 }, () => entry) },
    },
  ])('rejects $name in single and bulk reads', async ({ acl }) => {
    esClient.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: {
        hits: [{ _index: 'workflows', _id: 'workflow', _source: { access_control: acl } }],
      },
    });

    await expect(repository.getWorkflow('workflow', 'default')).rejects.toThrow();
    await expect(
      repository.getWorkflowExecutionStates([{ workflowId: 'workflow', spaceId: 'default' }])
    ).rejects.toThrow();
  });

  it.each([
    { name: 'legacy', acl: undefined },
    { name: 'public', acl: { access_mode: 'public', entries: [] } },
    { name: 'private', acl: { access_mode: 'private', entries: [entry] } },
  ])('preserves $name access in single and bulk reads', async ({ acl }) => {
    esClient.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: {
        hits: [
          {
            _index: 'workflows',
            _id: 'workflow',
            _source: { spaceId: 'default', enabled: true, access_control: acl },
          },
        ],
      },
    });

    const workflow = await repository.getWorkflow('workflow', 'default');
    const states = await repository.getWorkflowExecutionStates([
      { workflowId: 'workflow', spaceId: 'default' },
    ]);
    expect(workflow?.access_control).toEqual(acl);
    expect(states.get('default:workflow')).toEqual({ enabled: true, access_control: acl });
  });
});

describe('WorkflowRepository.areWorkflowsEnabled', () => {
  let repository: WorkflowRepository;
  let esClient: { search: jest.Mock };

  beforeEach(() => {
    esClient = { search: jest.fn() };
    repository = new WorkflowRepository({
      esClient: esClient as any,
      logger: loggingSystemMock.create().get(),
    });
  });

  it('loads ACLs and enabled state together for global workflows', async () => {
    const accessControl = { access_mode: 'private', entries: [] };
    esClient.search.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: {
        hits: [
          {
            _id: 'private',
            _source: {
              spaceId: '*',
              enabled: true,
              owner_id: 'owner',
              access_control: accessControl,
            },
          },
        ],
      },
    });
    const result = await repository.getWorkflowExecutionStates(
      [
        { workflowId: 'private', spaceId: 'space-a' },
        { workflowId: 'private', spaceId: 'space-b' },
        { workflowId: 'missing', spaceId: 'space-a' },
      ],
      { includeGlobal: true }
    );
    const state = { enabled: true, owner_id: 'owner', access_control: accessControl };
    expect([...result]).toEqual([
      ['space-a:private', state],
      ['space-b:private', state],
      ['space-a:missing', { enabled: false }],
    ]);
    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        _source: ['enabled', 'spaceId', 'owner_id', 'access_control'],
        allow_partial_search_results: false,
      })
    );
  });

  it('returns an empty map without hitting ES when refs is empty', async () => {
    const result = await repository.areWorkflowsEnabled([]);
    expect(result.size).toBe(0);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('issues a single search for a single-space batch and returns per-workflow enabled flags', async () => {
    esClient.search.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: {
        hits: [
          { _id: 'wf-a', _source: { enabled: true, spaceId: 'default' } },
          { _id: 'wf-b', _source: { enabled: false, spaceId: 'default' } },
        ],
      },
    });

    const result = await repository.areWorkflowsEnabled([
      { workflowId: 'wf-a', spaceId: 'default' },
      { workflowId: 'wf-b', spaceId: 'default' },
    ]);

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: WORKFLOW_INDEX_NAME,
        _source: ['enabled', 'spaceId', 'owner_id', 'access_control'],
        size: 2,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            should: [
              {
                bool: {
                  must: [{ ids: { values: ['wf-a', 'wf-b'] } }, { term: { spaceId: 'default' } }],
                  must_not: [],
                },
              },
            ],
            minimum_should_match: 1,
            must_not: [{ exists: { field: 'deleted_at' } }],
          }),
        }),
      })
    );

    expect(result.get('default:wf-a')).toBe(true);
    expect(result.get('default:wf-b')).toBe(false);
  });

  it('emits one should clause per space for multi-space batches', async () => {
    esClient.search.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: {
        hits: [
          { _id: 'wf-a', _source: { enabled: true, spaceId: 'space-1' } },
          { _id: 'wf-b', _source: { enabled: true, spaceId: 'space-2' } },
        ],
      },
    });

    const result = await repository.areWorkflowsEnabled([
      { workflowId: 'wf-a', spaceId: 'space-1' },
      { workflowId: 'wf-b', spaceId: 'space-2' },
    ]);

    const callArg = esClient.search.mock.calls[0][0];
    expect(callArg.query.bool.should).toHaveLength(2);
    expect(callArg.query.bool.should).toEqual(
      expect.arrayContaining([
        {
          bool: {
            must: [{ ids: { values: ['wf-a'] } }, { term: { spaceId: 'space-1' } }],
            must_not: [],
          },
        },
        {
          bool: {
            must: [{ ids: { values: ['wf-b'] } }, { term: { spaceId: 'space-2' } }],
            must_not: [],
          },
        },
      ])
    );

    expect(result.get('space-1:wf-a')).toBe(true);
    expect(result.get('space-2:wf-b')).toBe(true);
  });

  it('resolves missing docs to false', async () => {
    esClient.search.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: {
        hits: [{ _id: 'wf-a', _source: { enabled: true, spaceId: 'default' } }],
      },
    });

    const result = await repository.areWorkflowsEnabled([
      { workflowId: 'wf-a', spaceId: 'default' },
      { workflowId: 'wf-missing', spaceId: 'default' },
    ]);

    expect(result.get('default:wf-a')).toBe(true);
    expect(result.get('default:wf-missing')).toBe(false);
  });

  it('applies managed filter when managedFilter is managed', async () => {
    esClient.search.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: {
        hits: [],
      },
    });

    await repository.areWorkflowsEnabled([{ workflowId: 'wf-a', spaceId: 'default' }], {
      managedFilter: 'managed',
    });

    const callArg = esClient.search.mock.calls[0][0];
    expect(callArg.query.bool.should[0].bool.must).toEqual(
      expect.arrayContaining([{ term: { managed: true } }])
    );
  });

  it('applies unmanaged filter when managedFilter is unmanaged', async () => {
    esClient.search.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: {
        hits: [],
      },
    });

    await repository.areWorkflowsEnabled([{ workflowId: 'wf-a', spaceId: 'default' }], {
      managedFilter: 'unmanaged',
    });

    const callArg = esClient.search.mock.calls[0][0];
    expect(callArg.query.bool.should[0].bool.must_not).toEqual(
      expect.arrayContaining([{ term: { managed: true } }])
    );
  });

  it('dedupes repeated refs so one ES search covers them all', async () => {
    esClient.search.mockResolvedValue({
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: {
        hits: [{ _id: 'wf-a', _source: { enabled: true, spaceId: 'default' } }],
      },
    });

    const result = await repository.areWorkflowsEnabled([
      { workflowId: 'wf-a', spaceId: 'default' },
      { workflowId: 'wf-a', spaceId: 'default' },
      { workflowId: 'wf-a', spaceId: 'default' },
    ]);

    expect(esClient.search).toHaveBeenCalledTimes(1);
    const callArg = esClient.search.mock.calls[0][0];
    expect(callArg.size).toBe(1);
    expect(callArg.query.bool.should[0].bool.must[0]).toEqual({ ids: { values: ['wf-a'] } });
    expect(result.get('default:wf-a')).toBe(true);
  });

  it('returns the accumulated map (all false) when the index is missing', async () => {
    const err = new Error('no such index') as Error & { statusCode?: number };
    err.statusCode = 404;
    esClient.search.mockRejectedValue(err);

    const result = await repository.areWorkflowsEnabled([
      { workflowId: 'wf-a', spaceId: 'default' },
    ]);

    expect(result.size).toBe(0);
  });
});

describe('WorkflowRepository.getWorkflow', () => {
  const baseSource = {
    name: 'My workflow',
    enabled: true,
    valid: true,
    createdBy: 'user',
    lastUpdatedBy: 'user',
    yaml: 'name: My workflow',
    tags: ['a'],
  };

  it.each([false, true])(
    'keeps deletion filtering explicit with includeDeleted=%s',
    async (includeDeleted) => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: { hits: [] },
      });
      const repository = new WorkflowRepository({
        esClient,
        logger: loggingSystemMock.create().get(),
      });

      await repository.getWorkflow('wf-1', 'default', { includeDeleted });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          allow_partial_search_results: false,
          query: {
            bool: {
              must: [{ ids: { values: ['wf-1'] } }, { term: { spaceId: 'default' } }],
              must_not: includeDeleted ? [] : [{ exists: { field: 'deleted_at' } }],
            },
          },
        })
      );
    }
  );

  it('maps snake_case timestamps from the workflow index to EsWorkflow dates', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: {
          hits: [
            {
              _id: 'wf-1',
              _source: {
                ...baseSource,
                created_at: '2024-01-02T03:04:05.000Z',
                updated_at: '2024-06-07T08:09:10.000Z',
              },
            },
          ],
        },
      }),
    };
    const repository = new WorkflowRepository({
      esClient: esClient as any,
      logger: loggingSystemMock.create().get(),
    });

    const wf = await repository.getWorkflow('wf-1', 'default');
    expect(wf).not.toBeNull();
    expect(wf!.createdAt.toISOString()).toBe('2024-01-02T03:04:05.000Z');
    expect(wf!.lastUpdatedAt.toISOString()).toBe('2024-06-07T08:09:10.000Z');
  });

  it('maps managed workflow metadata when present', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: {
          hits: [
            {
              _id: 'system-workflow',
              _source: {
                ...baseSource,
                managed: true,
                managedBy: 'workflowsExtensionsExample',
                billable: true,
                originManagedWorkflowId: 'system-parent',
                managedVersion: 4,
                created_at: '2024-01-02T03:04:05.000Z',
                updated_at: '2024-06-07T08:09:10.000Z',
              },
            },
          ],
        },
      }),
    };
    const repository = new WorkflowRepository({
      esClient: esClient as any,
      logger: loggingSystemMock.create().get(),
    });

    const wf = await repository.getWorkflow('system-workflow', 'default');
    expect(wf).not.toBeNull();
    expect(wf).toMatchObject({
      managed: true,
      managedBy: 'workflowsExtensionsExample',
      billable: true,
      originManagedWorkflowId: 'system-parent',
      managedVersion: 4,
    });
  });

  it('applies managed filter in getWorkflow when managedFilter is managed', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: {
          hits: [
            {
              _id: 'wf-1',
              _source: {
                ...baseSource,
                created_at: '2024-01-02T03:04:05.000Z',
                updated_at: '2024-06-07T08:09:10.000Z',
              },
            },
          ],
        },
      }),
    };
    const repository = new WorkflowRepository({
      esClient: esClient as any,
      logger: loggingSystemMock.create().get(),
    });

    await repository.getWorkflow('wf-1', 'default', { managedFilter: 'managed' });

    const callArg = esClient.search.mock.calls[0][0];
    expect(callArg.query.bool.must).toEqual(expect.arrayContaining([{ term: { managed: true } }]));
  });

  it('applies unmanaged filter in getWorkflow when managedFilter is unmanaged', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: {
          hits: [
            {
              _id: 'wf-1',
              _source: {
                ...baseSource,
                created_at: '2024-01-02T03:04:05.000Z',
                updated_at: '2024-06-07T08:09:10.000Z',
              },
            },
          ],
        },
      }),
    };
    const repository = new WorkflowRepository({
      esClient: esClient as any,
      logger: loggingSystemMock.create().get(),
    });

    await repository.getWorkflow('wf-1', 'default', { managedFilter: 'unmanaged' });

    const callArg = esClient.search.mock.calls[0][0];
    expect(callArg.query.bool.must_not).toEqual(
      expect.arrayContaining([{ term: { managed: true } }])
    );
  });
});

describe('WorkflowRepository.isWorkflowEnabled', () => {
  it('delegates to areWorkflowsEnabled and reads the keyed flag', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: {
          hits: [{ _id: 'wf-a', _source: { enabled: true, spaceId: 'default' } }],
        },
      }),
    };
    const repository = new WorkflowRepository({
      esClient: esClient as any,
      logger: loggingSystemMock.create().get(),
    });

    await expect(repository.isWorkflowEnabled('wf-a', 'default')).resolves.toBe(true);
    expect(esClient.search).toHaveBeenCalledTimes(1);
  });

  it('returns false when the workflow is missing', async () => {
    const esClient = {
      search: jest
        .fn()
        .mockResolvedValue({ _shards: { total: 1, successful: 1, failed: 0 }, hits: { hits: [] } }),
    };
    const repository = new WorkflowRepository({
      esClient: esClient as any,
      logger: loggingSystemMock.create().get(),
    });

    await expect(repository.isWorkflowEnabled('wf-a', 'default')).resolves.toBe(false);
  });

  it('returns true for global workflow when includeGlobal is true', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: {
          hits: [{ _id: 'wf-a', _source: { enabled: true, spaceId: '*' } }],
        },
      }),
    };
    const repository = new WorkflowRepository({
      esClient: esClient as any,
      logger: loggingSystemMock.create().get(),
    });

    await expect(
      repository.isWorkflowEnabled('wf-a', 'default', { includeGlobal: true })
    ).resolves.toBe(true);
  });
});

describe('WorkflowRepository.isWorkflowEnabledRealtime', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const repository = new WorkflowRepository({ esClient, logger: loggingSystemMock.create().get() });

  it.each([
    [{ enabled: true, spaceId: 'default' }, true],
    [{ enabled: false, spaceId: 'default' }, false],
    [{ enabled: true, spaceId: 'other' }, false],
    [{ enabled: true, spaceId: '*' }, false],
    [{ enabled: true, spaceId: 'default', deleted_at: '2026-09-27' }, false],
  ])('checks current state and space for %j', async (source, expected) => {
    esClient.get.mockResolvedValue({ _source: source } as never);
    await expect(repository.isWorkflowEnabledRealtime('workflow', 'default')).resolves.toBe(
      expected
    );
    expect(esClient.get).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'workflow', realtime: true })
    );
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('treats a deleted workflow as disabled but propagates storage errors', async () => {
    esClient.get.mockRejectedValueOnce({ statusCode: 404 });
    await expect(repository.isWorkflowEnabledRealtime('workflow', 'default')).resolves.toBe(false);
    const error = new Error('storage unavailable');
    esClient.get.mockRejectedValueOnce(error);
    await expect(repository.isWorkflowEnabledRealtime('workflow', 'default')).rejects.toBe(error);
  });
});

describe('WorkflowRepository inherited execution admission', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const repository = new WorkflowRepository({ esClient, logger: loggingSystemMock.create().get() });
  const workflow = {
    id: 'child',
    managed: true,
    yaml: 'name: Child',
    definition: { name: 'Child', version: '1' as const, enabled: true, triggers: [], steps: [] },
  };
  const source = {
    spaceId: 'default',
    managed: true,
    yaml: workflow.yaml,
    definition: workflow.definition,
    enabled: true,
    valid: true,
  };

  it.each([
    [{}, true],
    [{ yaml: 'changed' }, true],
    [
      { definition: { ...workflow.definition, steps: [{ name: 'updated', type: 'console' }] } },
      true,
    ],
    [{ managed: false }, false],
    [{ managed: undefined }, false],
    [{ enabled: false }, false],
    [{ valid: false }, false],
    [{ spaceId: 'other' }, false],
    [{ spaceId: '*' }, true],
    [{ deleted_at: '2026-09-30' }, false],
  ])('checks eligibility without comparing content: %j', async (override, expected) => {
    esClient.get.mockResolvedValue({ _source: { ...source, ...override } } as never);
    await expect(repository.isManagedChildAdmissibleRealtime(workflow.id, 'default')).resolves.toBe(
      expected
    );
    expect(esClient.get).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'child', realtime: true })
    );
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it.each([
    [{}, true],
    [{ managed: false }, false],
    [{ managed: undefined }, false],
    [{ enabled: false }, false],
    [{ valid: false }, false],
    [{ spaceId: 'other' }, false],
    [{ yaml: 'changed' }, true],
    [{ definition: { ...workflow.definition, name: 'Changed' } }, true],
    [{ deleted_at: '2026-10-06' }, false],
  ])(
    'checks global managed eligibility without comparing content: %j',
    async (override, expected) => {
      esClient.get.mockResolvedValue({
        _source: { ...source, spaceId: '*', ...override },
      } as never);
      await expect(
        repository.isManagedChildAdmissibleRealtime(workflow.id, 'default')
      ).resolves.toBe(expected);
    }
  );

  it('rejects missing children and propagates storage failures', async () => {
    esClient.get.mockRejectedValueOnce({ statusCode: 404 });
    await expect(repository.isManagedChildAdmissibleRealtime(workflow.id, 'default')).resolves.toBe(
      false
    );
    esClient.get.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(
      repository.isManagedChildAdmissibleRealtime(workflow.id, 'default')
    ).rejects.toThrow('Unavailable');
  });
});

describe('getWorkflowsByIds', () => {
  const logger = loggingSystemMock.create().get();

  const searchHit = (id: string, source: Record<string, unknown> = {}) => ({
    _index: WORKFLOW_INDEX_NAME,
    _id: id,
    _source: {
      name: id,
      enabled: true,
      yaml: 'steps: []',
      definition: { steps: [] },
      valid: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      ...source,
    },
  });

  it('does not search when given no ids', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const repository = new WorkflowRepository({ esClient, logger });

    await expect(repository.getWorkflowsByIds([], 'default')).resolves.toEqual([]);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('returns enabled workflows in request order and skips missing ids', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const repository = new WorkflowRepository({ esClient, logger });
    esClient.search.mockResolvedValue({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, failed: 0 },
      hits: { hits: [searchHit('wf-2'), searchHit('wf-1')] },
    } as never);

    const result = await repository.getWorkflowsByIds(['wf-1', 'wf-2', 'wf-missing'], 'default');

    expect(result.map((workflow) => workflow.id)).toEqual(['wf-1', 'wf-2']);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: WORKFLOW_INDEX_NAME,
        size: 3,
        query: {
          bool: {
            must: expect.arrayContaining([
              { ids: { values: ['wf-1', 'wf-2', 'wf-missing'] } },
              { term: { enabled: true } },
              {
                bool: {
                  should: [
                    { term: { spaceId: 'default' } },
                    { term: { spaceId: GLOBAL_WORKFLOW_SPACE_ID } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ]),
            must_not: [{ exists: { field: 'deleted_at' } }],
          },
        },
      })
    );
  });

  it('fails the read when the search is incomplete', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const repository = new WorkflowRepository({ esClient, logger });
    esClient.search.mockResolvedValue({
      took: 1,
      timed_out: true,
      _shards: { total: 1, successful: 0, failed: 1 },
      hits: { hits: [] },
    } as never);

    await expect(repository.getWorkflowsByIds(['wf-1'], 'default')).rejects.toThrow(
      'Could not load workflows [wf-1] for trigger subscription resolution.'
    );
  });
});

describe('getWorkflowsSubscribedToTrigger', () => {
  const logger = loggingSystemMock.create().get();

  const searchHit = (id: string) => ({
    _index: WORKFLOW_INDEX_NAME,
    _id: id,
    _source: {
      name: id,
      enabled: true,
      yaml: 'steps: []',
      definition: { steps: [] },
      valid: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    sort: [1],
  });

  const completePage = (hits: unknown[]) => ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, failed: 0 },
    hits: { hits },
  });

  it('returns subscribers from a complete page', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const repository = new WorkflowRepository({ esClient, logger });
    esClient.openPointInTime.mockResolvedValue({ id: 'pit-1' } as never);
    esClient.search.mockResolvedValue(completePage([searchHit('wf-1')]) as never);

    const result = await repository.getWorkflowsSubscribedToTrigger('cases.updated', 'default');

    expect(result.map((workflow) => workflow.id)).toEqual(['wf-1']);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({ allow_partial_search_results: false })
    );
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
  });

  it.each([
    { timed_out: true, failed: 0 },
    { timed_out: false, failed: 1 },
  ])('fails the read when a page is incomplete: %j', async ({ timed_out, failed }) => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const repository = new WorkflowRepository({ esClient, logger });
    esClient.openPointInTime.mockResolvedValue({ id: 'pit-1' } as never);
    esClient.search.mockResolvedValue({
      took: 1,
      timed_out,
      _shards: { total: 1, successful: 1 - failed, failed },
      hits: { hits: [searchHit('wf-1')] },
    } as never);

    await expect(
      repository.getWorkflowsSubscribedToTrigger('cases.updated', 'default')
    ).rejects.toThrow('Could not load subscribers for trigger cases.updated in space default.');
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-1' });
  });
});
