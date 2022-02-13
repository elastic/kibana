/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildDataTelemetryPayload, getDataTelemetry } from './get_data_telemetry';
import { DATA_DATASETS_INDEX_PATTERNS, DATA_DATASETS_INDEX_PATTERNS_UNIQUE } from './constants';
import { elasticsearchServiceMock } from '../../../../../../src/core/server/mocks';

describe('get_data_telemetry', () => {
  describe('DATA_DATASETS_INDEX_PATTERNS', () => {
    DATA_DATASETS_INDEX_PATTERNS.forEach((entry, index, array) => {
      describe(`Pattern ${entry.pattern}`, () => {
        test('there should only be one in DATA_DATASETS_INDEX_PATTERNS_UNIQUE', () => {
          expect(
            DATA_DATASETS_INDEX_PATTERNS_UNIQUE.filter(({ pattern }) => pattern === entry.pattern)
          ).toHaveLength(1);
        });

        // This test is to make us sure that we don't update one of the duplicated entries and forget about any other repeated ones
        test('when a document is duplicated, the duplicates should be identical', () => {
          array.slice(0, index).forEach((previousEntry) => {
            if (entry.pattern === previousEntry.pattern) {
              expect(entry).toStrictEqual(previousEntry);
            }
          });
        });
      });
    });
  });

  describe('buildDataTelemetryPayload', () => {
    test('return the base object when no indices provided', () => {
      expect(buildDataTelemetryPayload([])).toStrictEqual([]);
    });

    test('return the base object when no matching indices provided', () => {
      expect(
        buildDataTelemetryPayload([
          { name: 'no__way__this__can_match_anything', sizeInBytes: 10 },
          { name: '.kibana-event-log-8.0.0' },
        ])
      ).toStrictEqual([]);
    });

    test('should not include Async Search indices', () => {
      expect(
        buildDataTelemetryPayload([
          { name: '.async_search', docCount: 0 },
          { name: '.async-search', docCount: 0 },
        ])
      ).toStrictEqual([]);
    });

    test('matches some indices and puts them in their own category', () => {
      expect(
        buildDataTelemetryPayload([
          // APM Indices have known shipper (so we can infer the dataStreamType from mapping constant)
          { name: 'apm-7.7.0-error-000001', shipper: 'apm', isECS: true },
          { name: 'apm-7.7.0-metric-000001', shipper: 'apm', isECS: true },
          { name: 'apm-7.7.0-onboarding-2020.05.17', shipper: 'apm', isECS: true },
          { name: 'apm-7.7.0-profile-000001', shipper: 'apm', isECS: true },
          { name: 'apm-7.7.0-span-000001', shipper: 'apm', isECS: true },
          { name: 'apm-7.7.0-transaction-000001', shipper: 'apm', isECS: true },
          // Packetbeat indices with known shipper (we can infer dataStreamType from mapping constant)
          { name: 'packetbeat-7.7.0-2020.06.11-000001', shipper: 'packetbeat', isECS: true },
          // Matching patterns from the list => known dataStreamDataset but the rest is unknown
          { name: 'filebeat-12314', docCount: 100, sizeInBytes: 10 },
          { name: 'metricbeat-1234', docCount: 100, sizeInBytes: 10, isECS: false },
          { name: '.app-search-1234', docCount: 0 },
          { name: 'logs-endpoint.1234', docCount: 0 }, // Matching pattern with a dot in the name
          { name: 'ml_host_risk_score_latest_default', docCount: 0 },
          { name: 'ml_host_risk_score_latest', docCount: 0 }, // This should not match,
          { name: 'ml_host_risk_score', docCount: 0 }, // This should not match
          // New Indexing strategy: everything can be inferred from the constant_keyword values
          {
            name: '.ds-logs-nginx.access-default-000001',
            dataStreamDataset: 'nginx.access',
            dataStreamType: 'logs',
            shipper: 'filebeat',
            isECS: true,
            docCount: 1000,
            sizeInBytes: 1000,
          },
          {
            name: '.ds-logs-nginx.access-default-000002',
            dataStreamDataset: 'nginx.access',
            dataStreamType: 'logs',
            shipper: 'filebeat',
            isECS: true,
            docCount: 1000,
            sizeInBytes: 60,
          },
          {
            name: '.ds-traces-something-default-000002',
            dataStreamDataset: 'something',
            dataStreamType: 'traces',
            packageName: 'some-package',
            isECS: true,
            docCount: 1000,
            sizeInBytes: 60,
          },
          {
            name: '.ds-metrics-something.else-default-000002',
            dataStreamDataset: 'something.else',
            dataStreamType: 'metrics',
            managedBy: 'ingest-manager',
            isECS: true,
            docCount: 1000,
            sizeInBytes: 60,
          },
          // Filter out if it has dataStreamDataset and dataStreamType but none of the shipper, packageName or managedBy === 'ingest-manager'
          {
            name: 'some-index-that-should-not-show',
            dataStreamDataset: 'should-not-show',
            dataStreamType: 'logs',
            isECS: true,
            docCount: 1000,
            sizeInBytes: 60,
          },
          {
            name: 'other-index-that-should-not-show',
            dataStreamDataset: 'should-not-show-either',
            dataStreamType: 'metrics',
            managedBy: 'me',
            isECS: true,
            docCount: 1000,
            sizeInBytes: 60,
          },
        ])
      ).toStrictEqual([
        {
          shipper: 'apm',
          index_count: 6,
          ecs_index_count: 6,
        },
        {
          shipper: 'packetbeat',
          index_count: 1,
          ecs_index_count: 1,
        },
        {
          pattern_name: 'filebeat',
          shipper: 'filebeat',
          index_count: 1,
          doc_count: 100,
          size_in_bytes: 10,
        },
        {
          pattern_name: 'metricbeat',
          shipper: 'metricbeat',
          index_count: 1,
          ecs_index_count: 0,
          doc_count: 100,
          size_in_bytes: 10,
        },
        {
          pattern_name: 'app-search',
          index_count: 1,
          doc_count: 0,
        },
        {
          pattern_name: 'logs-endpoint',
          shipper: 'endpoint',
          index_count: 1,
          doc_count: 0,
        },
        {
          pattern_name: 'host_risk_score',
          index_count: 1,
          doc_count: 0,
        },
        {
          data_stream: { dataset: 'nginx.access', type: 'logs' },
          shipper: 'filebeat',
          index_count: 2,
          ecs_index_count: 2,
          doc_count: 2000,
          size_in_bytes: 1060,
        },
        {
          data_stream: { dataset: 'something', type: 'traces' },
          package: { name: 'some-package' },
          index_count: 1,
          ecs_index_count: 1,
          doc_count: 1000,
          size_in_bytes: 60,
        },
        {
          data_stream: { dataset: 'something.else', type: 'metrics' },
          index_count: 1,
          ecs_index_count: 1,
          doc_count: 1000,
          size_in_bytes: 60,
        },
      ]);
    });
  });

  describe('getDataTelemetry', () => {
    test('it returns the base payload (all 0s) because no indices are found', async () => {
      const esClient = mockEsClient();
      await expect(getDataTelemetry(esClient)).resolves.toStrictEqual([]);
      expect(esClient.indices.getMapping).toHaveBeenCalledTimes(1);
      expect(esClient.indices.stats).toHaveBeenCalledTimes(1);
    });

    test('can only see the index mappings, but not the stats', async () => {
      const esClient = mockEsClient(['filebeat-12314']);
      await expect(getDataTelemetry(esClient)).resolves.toStrictEqual([
        {
          pattern_name: 'filebeat',
          shipper: 'filebeat',
          index_count: 1,
          ecs_index_count: 0,
        },
      ]);
      expect(esClient.indices.getMapping).toHaveBeenCalledTimes(1);
      expect(esClient.indices.stats).toHaveBeenCalledTimes(1);
    });

    test('can see the mappings and the stats', async () => {
      const esClient = mockEsClient(
        ['filebeat-12314'],
        { isECS: true },
        {
          indices: {
            'filebeat-12314': { total: { docs: { count: 100 }, store: { size_in_bytes: 10 } } },
          },
        }
      );
      await expect(getDataTelemetry(esClient)).resolves.toStrictEqual([
        {
          pattern_name: 'filebeat',
          shipper: 'filebeat',
          index_count: 1,
          ecs_index_count: 1,
          doc_count: 100,
          size_in_bytes: 10,
        },
      ]);
    });

    test('find an index that does not match any index pattern but has mappings metadata', async () => {
      const esClient = mockEsClient(
        ['cannot_match_anything'],
        { isECS: true, dataStreamType: 'traces', shipper: 'my-beat' },
        {
          indices: {
            cannot_match_anything: {
              total: { docs: { count: 100 }, store: { size_in_bytes: 10 } },
            },
          },
        }
      );
      await expect(getDataTelemetry(esClient)).resolves.toStrictEqual([
        {
          data_stream: { dataset: undefined, type: 'traces' },
          shipper: 'my-beat',
          index_count: 1,
          ecs_index_count: 1,
          doc_count: 100,
          size_in_bytes: 10,
        },
      ]);
    });

    test('return empty array when there is an error', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.indices.getMapping.mockRejectedValue(new Error('Something went terribly wrong'));
      esClient.indices.stats.mockRejectedValue(new Error('Something went terribly wrong'));
      await expect(getDataTelemetry(esClient)).resolves.toStrictEqual([]);
    });
  });
});
function mockEsClient(
  indicesMappings: string[] = [], // an array of `indices` to get mappings from.
  { isECS = false, dataStreamDataset = '', dataStreamType = '', shipper = '' } = {},
  indexStats = {}
) {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  // @ts-expect-error
  esClient.indices.getMapping.mockImplementationOnce(async () => {
    const body = Object.fromEntries(
      indicesMappings.map((index) => [
        index,
        {
          mappings: {
            ...(shipper && { _meta: { beat: shipper } }),
            properties: {
              ...(isECS && { ecs: { properties: { version: { type: 'keyword' } } } }),
              ...((dataStreamType || dataStreamDataset) && {
                data_stream: {
                  properties: {
                    ...(dataStreamDataset && {
                      dataset: { type: 'constant_keyword', value: dataStreamDataset },
                    }),
                    ...(dataStreamType && {
                      type: { type: 'constant_keyword', value: dataStreamType },
                    }),
                  },
                },
              }),
            },
          },
        },
      ])
    );
    return body;
  });
  // @ts-expect-error
  esClient.indices.stats.mockImplementationOnce(async () => {
    return indexStats;
  });
  return esClient;
}
