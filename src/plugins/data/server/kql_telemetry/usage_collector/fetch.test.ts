/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fetchProvider } from './fetch';
import { ElasticsearchClient } from 'kibana/server';
import { CollectorFetchContext } from 'src/plugins/usage_collection/server';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';

jest.mock('../../../common', () => ({
  DEFAULT_QUERY_LANGUAGE: 'lucene',
  UI_SETTINGS: {
    SEARCH_QUERY_LANGUAGE: 'search:queryLanguage',
  },
}));

let fetch: ReturnType<typeof fetchProvider>;
let esClient: ElasticsearchClient;
let collectorFetchContext: CollectorFetchContext;
const collectorFetchContextMock = createCollectorFetchContextMock();

function setupMockCallCluster(
  optCount: { optInCount?: number; optOutCount?: number } | null,
  language: string | undefined | null
) {
  function mockedEsGetMethod() {
    if (optCount === null) {
      return Promise.resolve({
        _index: '.kibana_1',
        _id: 'kql-telemetry:kql-telemetry',
        found: false,
      });
    } else {
      return Promise.resolve({
        _source: {
          'kql-telemetry': { ...optCount },
          type: 'kql-telemetry',
          updated_at: '2018-10-05T20:20:56.258Z',
        },
      });
    }
  }

  function mockedEsSearchMethod() {
    if (language === 'missingConfigDoc') {
      return Promise.resolve({ hits: { hits: [] } });
    } else {
      return Promise.resolve({
        hits: {
          hits: [
            {
              _source: {
                config: {
                  'search:queryLanguage': language,
                },
              },
            },
          ],
        },
      });
    }
  }

  const esClientMock = {
    get: jest.fn().mockImplementation(mockedEsGetMethod),
    search: jest.fn().mockImplementation(mockedEsSearchMethod),
  } as unknown as ElasticsearchClient;
  esClient = esClientMock;
}

describe('makeKQLUsageCollector', () => {
  describe('fetch method', () => {
    beforeEach(() => {
      fetch = fetchProvider('.kibana');
    });

    it('should return opt in data from the .kibana/kql-telemetry doc', async () => {
      setupMockCallCluster({ optInCount: 1 }, 'kuery');
      collectorFetchContext = {
        ...collectorFetchContextMock,
        esClient,
      };
      const fetchResponse = await fetch(collectorFetchContext);
      expect(fetchResponse.optInCount).toBe(1);
      expect(fetchResponse.optOutCount).toBe(0);
    });

    it('should return the default query language set in advanced settings', async () => {
      setupMockCallCluster({ optInCount: 1 }, 'kuery');
      collectorFetchContext = {
        ...collectorFetchContextMock,
        esClient,
      };
      const fetchResponse = await fetch(collectorFetchContext);
      expect(fetchResponse.defaultQueryLanguage).toBe('kuery');
    });

    // Indicates the user has modified the setting at some point but the value is currently the default
    it('should return the kibana default query language if the config value is null', async () => {
      setupMockCallCluster({ optInCount: 1 }, null);
      collectorFetchContext = {
        ...collectorFetchContextMock,
        esClient,
      };
      const fetchResponse = await fetch(collectorFetchContext);
      expect(fetchResponse.defaultQueryLanguage).toBe('lucene');
    });

    it('should indicate when the default language has never been modified by the user', async () => {
      setupMockCallCluster({ optInCount: 1 }, undefined);
      collectorFetchContext = {
        ...collectorFetchContextMock,
        esClient,
      };
      const fetchResponse = await fetch(collectorFetchContext);
      expect(fetchResponse.defaultQueryLanguage).toBe('default-lucene');
    });

    it('should default to 0 opt in counts if the .kibana/kql-telemetry doc does not exist', async () => {
      setupMockCallCluster(null, 'kuery');
      collectorFetchContext = {
        ...collectorFetchContextMock,
        esClient,
      };
      const fetchResponse = await fetch(collectorFetchContext);
      expect(fetchResponse.optInCount).toBe(0);
      expect(fetchResponse.optOutCount).toBe(0);
    });

    it('should default to the kibana default language if the config document does not exist', async () => {
      setupMockCallCluster(null, 'missingConfigDoc');
      collectorFetchContext = {
        ...collectorFetchContextMock,
        esClient,
      };
      const fetchResponse = await fetch(collectorFetchContext);
      expect(fetchResponse.defaultQueryLanguage).toBe('default-lucene');
    });
  });
});
