/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { buildIngestSolutionsPayload, getIngestSolutions } from './ingest_solutions';

describe('ingest_solutions', () => {
  describe('buildIngestSolutionsPayload', () => {
    test('return the base object when no indices provided', () => {
      expect(buildIngestSolutionsPayload([])).toStrictEqual({});
    });

    test('return the base object when no matching indices provided', () => {
      expect(
        buildIngestSolutionsPayload([
          { name: 'no-way-this-can_match_anything', sizeInBytes: 10 },
          { name: '.kibana-event-log-8.0.0' },
        ])
      ).toStrictEqual({});
    });

    test('matches some indices and puts them in their own category', () => {
      expect(
        buildIngestSolutionsPayload([
          { name: 'apm-1234' },
          { name: 'apm-5677' },
          { name: 'filebeat-12314', docCount: 100, sizeInBytes: 10 },
          { name: 'metricbeat-1234', docCount: 100, sizeInBytes: 10, isECS: false },
          { name: 'my_logs_custom', docCount: 1000, sizeInBytes: 10 },
          { name: 'my_logs', docCount: 100, sizeInBytes: 10, isECS: true },
          { name: 'logs_custom' },
          { name: '.app-search-1234', docCount: 0 },
        ])
      ).toStrictEqual({
        data_providers: {
          apm: { index_count: 2 },
          filebeat: { index_count: 1, doc_count: 100, size_in_bytes: 10 },
          metricbeat: { index_count: 1, ecs_index_count: 0, doc_count: 100, size_in_bytes: 10 },
          logs: { index_count: 3, ecs_index_count: 1, doc_count: 1100, size_in_bytes: 20 },
          'app-search': { index_count: 1, doc_count: 0 },
        },
      });
    });
  });

  describe('getIngestSolutions', () => {
    test('it returns the base payload (all 0s) because no indices are found', async () => {
      const callCluster = mockCallCluster();
      await expect(getIngestSolutions(callCluster)).resolves.toStrictEqual({});
    });

    test('can only see the index in the state, but not the stats', async () => {
      const callCluster = mockCallCluster(['filebeat-12314']);
      await expect(getIngestSolutions(callCluster)).resolves.toStrictEqual({
        data_providers: {
          filebeat: { index_count: 1, ecs_index_count: 0 },
        },
      });
    });

    test('can see the state and the stats', async () => {
      const callCluster = mockCallCluster(['filebeat-12314'], true, {
        indices: {
          'filebeat-12314': { total: { docs: { count: 100 }, store: { size_in_bytes: 10 } } },
        },
      });
      await expect(getIngestSolutions(callCluster)).resolves.toStrictEqual({
        data_providers: {
          filebeat: { index_count: 1, ecs_index_count: 1, doc_count: 100, size_in_bytes: 10 },
        },
      });
    });
  });
});

function mockCallCluster(stateIndices: string[] = [], isECS = false, indexStats: any = {}) {
  return jest.fn().mockImplementation(async (method: string, opts: any) => {
    if (method === 'cluster.state') {
      return {
        metadata: {
          indices: Object.fromEntries(
            stateIndices.map((index, version) => [
              index,
              {
                version,
                ...(isECS
                  ? {
                      mappings: {
                        _doc: {
                          properties: { ecs: { properties: { version: { type: 'keyword' } } } },
                        },
                      },
                    }
                  : {}),
              },
            ])
          ),
        },
      };
    }
    return indexStats;
  });
}
