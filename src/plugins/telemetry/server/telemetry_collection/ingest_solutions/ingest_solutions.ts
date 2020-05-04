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
import { TECHNOLOGIES } from './constants';

type TechnologyDataProviders = typeof TECHNOLOGIES[number]['name'];

export interface IngestSolutionsPayload {
  data_providers: {
    [key in TechnologyDataProviders]: {
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

function buildBaseObject(): IngestSolutionsPayload {
  return {
    data_providers: TECHNOLOGIES.reduce(
      (acc, { name }) => ({ ...acc, [name]: { index_count: 0 } }),
      {} as IngestSolutionsPayload['data_providers']
    ),
  };
}

export function buildIngestSolutionsPayload(
  indices: IngestSolutionsIndex[]
): IngestSolutionsPayload {
  const basePayload = buildBaseObject();

  return indices.reduce((acc, { name: indexName, isECS, docCount, sizeInBytes }) => {
    const matchingTechnology = TECHNOLOGIES.find(({ pattern }) =>
      new RegExp(`^${pattern.replace(/\*/g, '.*')}$`).test(indexName)
    );
    if (!matchingTechnology) {
      return acc;
    }
    const { name } = matchingTechnology;
    return {
      ...acc,
      data_providers: {
        ...acc.data_providers,
        [name]: {
          ...acc.data_providers[name],
          index_count: acc.data_providers[name].index_count + 1,
          ...(typeof isECS === 'boolean'
            ? { ecs_index_count: (acc.data_providers[name].ecs_index_count || 0) + (isECS ? 1 : 0) }
            : {}),
          ...(docCount ? { doc_count: (acc.data_providers[name].doc_count || 0) + docCount } : {}),
          ...(sizeInBytes
            ? { size_in_bytes: (acc.data_providers[name].size_in_bytes || 0) + sizeInBytes }
            : {}),
        },
      },
    };
  }, basePayload);
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
  const index = TECHNOLOGIES.map(({ pattern }) => pattern);
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
  const indexNames = Object.keys(stateIndices)
    // Filter out the system indices
    .filter(name => !name.startsWith('.'));
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
