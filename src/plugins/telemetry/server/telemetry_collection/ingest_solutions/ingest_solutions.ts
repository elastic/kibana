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

import { APICaller } from 'kibana/server';
import { INGEST_SOLUTIONS } from './constants';

type TechnologyDataProviders = typeof INGEST_SOLUTIONS[number]['name'];

export interface IngestSolutionsPayload {
  data_providers: {
    [key in TechnologyDataProviders]?: {
      index_count: number;
      ecs_index_count?: number;
      doc_count?: number;
      size_in_bytes?: number;
    };
  };
}

export interface IngestSolutionsIndex {
  name: string;
  isECS?: boolean; // Optional because it can't be obtained via Monitoring.

  // The fields below are optional because we might not be able to obtain them if the user does not
  // have access to the index.
  docCount?: number;
  sizeInBytes?: number;
}

export function buildIngestSolutionsPayload(
  indices: IngestSolutionsIndex[]
): IngestSolutionsPayload {
  const startingDotPatternsUntilTheFirstAsterisk = INGEST_SOLUTIONS.map(({ pattern }) =>
    pattern.replace(/^\.(.+)\*.*$/g, '.$1')
  ).filter(Boolean);
  return indices.reduce((acc, { name: indexName, isECS, docCount, sizeInBytes }) => {
    // Filter out the system indices unless they are required by the patterns
    if (
      indexName.startsWith('.') &&
      !startingDotPatternsUntilTheFirstAsterisk.find(pattern => indexName.startsWith(pattern))
    ) {
      return acc;
    }
    const matchingTechnology = INGEST_SOLUTIONS.find(({ pattern }) => {
      if (!pattern.startsWith('.') && indexName.startsWith('.')) {
        // avoid system indices caught by very fuzzy index patters (i.e.: *log* would catch `.kibana-log-...`)
        return false;
      }
      return new RegExp(`^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`).test(indexName);
    });

    if (!matchingTechnology) {
      return acc;
    }
    const { name } = matchingTechnology;
    const dataProviders = acc.data_providers || {};
    return {
      ...acc,
      data_providers: {
        ...dataProviders,
        [name]: {
          ...dataProviders[name],
          index_count: (dataProviders[name]?.index_count || 0) + 1,
          ...(typeof isECS === 'boolean'
            ? {
                ecs_index_count: (dataProviders[name]?.ecs_index_count || 0) + (isECS ? 1 : 0),
              }
            : {}),
          ...(docCount ? { doc_count: (dataProviders[name]?.doc_count || 0) + docCount } : {}),
          ...(sizeInBytes
            ? { size_in_bytes: (dataProviders[name]?.size_in_bytes || 0) + sizeInBytes }
            : {}),
        },
      },
    };
  }, {} as IngestSolutionsPayload);
}

interface IndexStats {
  indices: {
    [indexName: string]: {
      total: {
        docs: {
          count: number;
          deleted: number;
        };
        store: {
          size_in_bytes: number;
        };
      };
    };
  };
}

interface ClusterState {
  metadata: {
    indices: {
      [indexName: string]: {
        version: number;
        mappings: {
          _doc?: {
            properties: {
              ecs?: {
                properties: {
                  version?: {
                    type: string;
                  };
                };
              };
            };
          };
          [_type: string]: object | undefined;
        };
      };
    };
  };
}

export async function getIngestSolutions(callCluster: APICaller) {
  const index = INGEST_SOLUTIONS.map(({ pattern }) => pattern);
  const [state, indexStats]: [ClusterState, IndexStats] = await Promise.all([
    // GET _cluster/state/metadata/<index>?filter_path=metadata.indices.*.version
    callCluster<ClusterState>('cluster.state', {
      index,
      metric: 'metadata',
      filterPath: [
        // The payload is huge and we are only after the name (no other useful stuff so far)
        'metadata.indices.*.version',
        // Does it have `ecs.version` in the mappings?
        'metadata.indices.*.mappings._doc.properties.ecs.properties.version.type',
      ],
    }),
    // GET <index>/_stats/docs,store?level=indices&filter_path=indices.*.total
    callCluster<IndexStats>('indices.stats', {
      index,
      level: 'indices',
      metric: ['docs', 'store'],
      filterPath: ['indices.*.total'],
    }),
  ]);

  const stateIndices = state?.metadata?.indices || {};
  const indexNames = Object.keys(stateIndices);
  const indices = indexNames.map(name => {
    const isECS = !!stateIndices[name]?.mappings?._doc?.properties.ecs?.properties.version?.type;

    const stats = (indexStats?.indices || {})[name];
    if (stats) {
      return {
        name,
        isECS,
        docCount: stats.total?.docs?.count,
        sizeInBytes: stats.total?.store?.size_in_bytes,
      };
    }
    return { name, isECS };
  });
  return buildIngestSolutionsPayload(indices);
}
