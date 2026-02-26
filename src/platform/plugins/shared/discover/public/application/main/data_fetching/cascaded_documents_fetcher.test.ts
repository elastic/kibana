/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord, type DataTableRecord } from '@kbn/discover-utils';
import type { AggregateQuery } from '@kbn/es-query';
import { constructCascadeQuery } from '@kbn/esql-utils';
import { apm } from '@elastic/apm-rum';
import { RequestAdapter } from '@kbn/inspector-plugin/public';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import { createDiscoverServicesMock } from '../../../__mocks__/services';
import type {
  CascadedDocumentsStateManager,
  FetchCascadedDocumentsParams,
} from './cascaded_documents_fetcher';
import { CascadedDocumentsFetcher } from './cascaded_documents_fetcher';
import { fetchEsql } from './fetch_esql';

jest.mock('./fetch_esql', () => ({
  fetchEsql: jest.fn(),
}));

jest.mock('@kbn/esql-utils', () => {
  const actual = jest.requireActual('@kbn/esql-utils');
  return {
    ...actual,
    constructCascadeQuery: jest.fn(actual.constructCascadeQuery),
  };
});

jest.mock('@elastic/apm-rum', () => ({
  apm: {
    captureError: jest.fn(),
  },
}));

const mockFetchEsql = jest.mocked(fetchEsql);
const mockConstructCascadeQuery = jest.mocked(constructCascadeQuery);
const mockApmCaptureError = jest.mocked(apm.captureError);

const createStateManager = (): CascadedDocumentsStateManager => {
  const recordsById = new Map<string, DataTableRecord[]>();
  return {
    getIsActiveInstance: jest.fn(() => true),
    getCascadedDocuments: jest.fn((nodeId: string) => recordsById.get(nodeId)),
    setCascadedDocuments: jest.fn((nodeId: string, records: DataTableRecord[]) => {
      recordsById.set(nodeId, records);
    }),
  };
};

const createFetcher = () => {
  const discoverServices = createDiscoverServicesMock();
  const scopedProfilesManager = discoverServices.profilesManager.createScopedProfilesManager({
    scopedEbtManager: discoverServices.ebtManager.createScopedEBTManager(),
  });
  const stateManager = createStateManager();

  return {
    stateManager,
    fetcher: new CascadedDocumentsFetcher(discoverServices, scopedProfilesManager, stateManager),
    scopedProfilesManager,
    discoverServices,
  };
};

const createFetchParams = (
  overrides: Partial<FetchCascadedDocumentsParams> = {}
): FetchCascadedDocumentsParams => {
  return {
    nodeId: 'node-1',
    nodeType: 'leaf',
    nodePath: ['extension'],
    nodePathMap: { extension: 'png' },
    query: { esql: 'from logs | stats count by extension' },
    esqlVariables: undefined,
    dataView: dataViewWithTimefieldMock,
    timeRange: { from: 'now-15m', to: 'now' },
    ...overrides,
  };
};

describe('CascadedDocumentsFetcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached records without fetching', async () => {
    const { stateManager, fetcher } = createFetcher();
    const cached = [buildDataTableRecord({ _id: '1', _index: 'logs' }, dataViewWithTimefieldMock)];

    stateManager.setCascadedDocuments('node-1', cached);

    const result = await fetcher.fetchCascadedDocuments(createFetchParams());

    expect(result).toBe(cached);
    expect(mockFetchEsql).not.toHaveBeenCalled();
    expect(mockConstructCascadeQuery).not.toHaveBeenCalled();
  });

  it('constructs a cascade query, fetches records, and caches them', async () => {
    const { stateManager, fetcher, scopedProfilesManager, discoverServices } = createFetcher();
    const records = [buildDataTableRecord({ _id: '1', _index: 'logs' }, dataViewWithTimefieldMock)];
    const cascadeQuery: AggregateQuery = { esql: 'from logs' };

    mockConstructCascadeQuery.mockReturnValueOnce(cascadeQuery);
    mockFetchEsql.mockResolvedValue({ records });

    const params = createFetchParams({ nodeId: 'node-2' });
    const result = await fetcher.fetchCascadedDocuments(params);

    expect(result).toEqual(records);
    expect(mockConstructCascadeQuery).toHaveBeenCalledWith({
      query: params.query,
      esqlVariables: params.esqlVariables,
      dataView: params.dataView,
      nodeType: params.nodeType,
      nodePath: params.nodePath,
      nodePathMap: params.nodePathMap,
    });
    expect(mockFetchEsql).toHaveBeenCalledWith(
      expect.objectContaining({
        query: cascadeQuery,
        esqlVariables: params.esqlVariables,
        dataView: params.dataView,
        data: discoverServices.data,
        expressions: discoverServices.expressions,
        timeRange: params.timeRange,
        scopedProfilesManager,
        inspectorAdapters: {
          requests: expect.any(RequestAdapter),
        },
        inspectorConfig: {
          title: 'Cascade Row Data Query',
          description:
            'This request queries Elasticsearch to fetch the documents matching the value of the expanded cascade row.',
        },
      })
    );
    expect(stateManager.setCascadedDocuments).toHaveBeenCalledWith(params.nodeId, records);
  });

  it('captures an error when the cascade query cannot be constructed', async () => {
    const { stateManager, fetcher } = createFetcher();

    mockConstructCascadeQuery.mockReturnValueOnce(undefined);

    const result = await fetcher.fetchCascadedDocuments(createFetchParams());

    expect(result).toEqual([]);
    expect(mockFetchEsql).not.toHaveBeenCalled();
    expect(stateManager.setCascadedDocuments).not.toHaveBeenCalled();
    expect(mockApmCaptureError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to construct cascade query' })
    );
  });

  it('rejects when the request is aborted', async () => {
    const { fetcher } = createFetcher();
    const delay = Promise.withResolvers<void>();

    mockFetchEsql.mockImplementation(async ({ abortSignal }) => {
      await delay.promise;
      abortSignal?.throwIfAborted();
      return { records: [] };
    });

    const fetchPromise = fetcher.fetchCascadedDocuments(createFetchParams({ nodeId: 'node-3' }));

    fetcher.cancelFetch('node-3');
    delay.resolve();

    await expect(fetchPromise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('does not cancel fetches when the instance is inactive', async () => {
    const { stateManager, fetcher } = createFetcher();
    const delay = Promise.withResolvers<void>();
    const records = [buildDataTableRecord({ _id: '1', _index: 'logs' }, dataViewWithTimefieldMock)];
    let capturedSignal: AbortSignal | undefined;

    jest.mocked(stateManager.getIsActiveInstance).mockReturnValue(false);
    mockFetchEsql.mockImplementation(async ({ abortSignal }) => {
      capturedSignal = abortSignal;
      await delay.promise;
      abortSignal?.throwIfAborted();
      return { records };
    });

    const fetchPromise = fetcher.fetchCascadedDocuments(createFetchParams({ nodeId: 'node-6' }));

    fetcher.cancelFetch('node-6');
    delay.resolve();

    await expect(fetchPromise).resolves.toEqual(records);
    expect(capturedSignal).toBeDefined();
    expect(capturedSignal?.aborted).toBe(false);
    expect(stateManager.setCascadedDocuments).toHaveBeenCalledWith('node-6', records);
  });

  it('aborts all active fetches', async () => {
    const { fetcher } = createFetcher();
    const delay = Promise.withResolvers<void>();

    mockFetchEsql.mockImplementation(async ({ abortSignal }) => {
      await delay.promise;
      abortSignal?.throwIfAborted();
      return { records: [] };
    });

    const first = fetcher.fetchCascadedDocuments(createFetchParams({ nodeId: 'node-4' }));
    const second = fetcher.fetchCascadedDocuments(createFetchParams({ nodeId: 'node-5' }));

    fetcher.cancelAllFetches();
    delay.resolve();

    const results = await Promise.allSettled([first, second]);

    expect(results).toEqual([
      expect.objectContaining({
        status: 'rejected',
        reason: expect.objectContaining({ name: 'AbortError' }),
      }),
      expect.objectContaining({
        status: 'rejected',
        reason: expect.objectContaining({ name: 'AbortError' }),
      }),
    ]);
  });
});
