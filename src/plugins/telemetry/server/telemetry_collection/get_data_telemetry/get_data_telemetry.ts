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

import { LegacyAPICaller } from 'kibana/server';
import {
  DATA_DATASETS_INDEX_PATTERNS_UNIQUE,
  DataPatternName,
  DataTelemetryType,
} from './constants';

export interface DataTelemetryBasePayload {
  index_count: number;
  ecs_index_count?: number;
  doc_count?: number;
  size_in_bytes?: number;
}

export interface DataTelemetryDocument extends DataTelemetryBasePayload {
  dataset?: {
    name?: string;
    type?: DataTelemetryType | 'unknown' | string; // The union of types is to help autocompletion with some known `dataset.type`s
  };
  shipper?: string;
  pattern_name?: DataPatternName;
}

export type DataTelemetryPayload = DataTelemetryDocument[];

export interface DataTelemetryIndex {
  name: string;
  datasetName?: string; // To be obtained from `mappings.dataset.name` if it's a constant keyword
  datasetType?: string; // To be obtained from `mappings.dataset.type` if it's a constant keyword
  shipper?: string; // To be obtained from `_meta.beat` if it's set
  isECS?: boolean; // Optional because it can't be obtained via Monitoring.

  // The fields below are optional because we might not be able to obtain them if the user does not
  // have access to the index.
  docCount?: number;
  sizeInBytes?: number;
}

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

type DataDescriptor = AtLeastOne<{
  datasetName: string;
  datasetType: string;
  shipper: string;
  patternName: DataPatternName; // When found from the list of the index patterns
}>;

function findMatchingDescriptors({
  name,
  shipper,
  datasetName,
  datasetType,
}: DataTelemetryIndex): DataDescriptor[] {
  // If we already have the data from the indices' mappings...
  if ([shipper, datasetName, datasetType].some(Boolean)) {
    return [
      {
        ...(shipper && { shipper }),
        ...(datasetName && { datasetName }),
        ...(datasetType && { datasetType }),
      } as AtLeastOne<{ datasetName: string; datasetType: string; shipper: string }>, // Using casting here because TS doesn't infer at least one exists from the if clause
    ];
  }

  // Otherwise, try with the list of known index patterns
  return DATA_DATASETS_INDEX_PATTERNS_UNIQUE.filter(({ pattern }) => {
    if (!pattern.startsWith('.') && name.startsWith('.')) {
      // avoid system indices caught by very fuzzy index patterns (i.e.: *log* would catch `.kibana-log-...`)
      return false;
    }
    return new RegExp(`^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`).test(name);
  });
}

function increaseCounters(
  previousValue: DataTelemetryBasePayload = { index_count: 0 },
  { isECS, docCount, sizeInBytes }: DataTelemetryIndex
) {
  return {
    ...previousValue,
    index_count: previousValue.index_count + 1,
    ...(typeof isECS === 'boolean'
      ? {
          ecs_index_count: (previousValue.ecs_index_count || 0) + (isECS ? 1 : 0),
        }
      : {}),
    ...(typeof docCount === 'number'
      ? { doc_count: (previousValue.doc_count || 0) + docCount }
      : {}),
    ...(typeof sizeInBytes === 'number'
      ? { size_in_bytes: (previousValue.size_in_bytes || 0) + sizeInBytes }
      : {}),
  };
}

export function buildDataTelemetryPayload(indices: DataTelemetryIndex[]): DataTelemetryPayload {
  const startingDotPatternsUntilTheFirstAsterisk = DATA_DATASETS_INDEX_PATTERNS_UNIQUE.map(
    ({ pattern }) => pattern.replace(/^\.(.+)\*.*$/g, '.$1')
  ).filter(Boolean);

  // Filter out the system indices unless they are required by the patterns
  const indexCandidates = indices.filter(
    ({ name }) =>
      !(
        name.startsWith('.') &&
        !startingDotPatternsUntilTheFirstAsterisk.find((pattern) => name.startsWith(pattern))
      )
  );

  const acc = new Map<string, DataTelemetryDocument>();

  for (const indexCandidate of indexCandidates) {
    const matchingDescriptors = findMatchingDescriptors(indexCandidate);
    for (const { datasetName, datasetType, shipper, patternName } of matchingDescriptors) {
      const key = `${datasetName}-${datasetType}-${shipper}-${patternName}`;
      acc.set(key, {
        ...((datasetName || datasetType) && { dataset: { name: datasetName, type: datasetType } }),
        ...(shipper && { shipper }),
        ...(patternName && { pattern_name: patternName }),
        ...increaseCounters(acc.get(key), indexCandidate),
      });
    }
  }

  return [...acc.values()];
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

interface IndexMappings {
  [indexName: string]: {
    mappings: {
      _meta?: {
        beat?: string;
      };
      properties: {
        dataset?: {
          properties: {
            name?: {
              type: string;
              value?: string;
            };
            type?: {
              type: string;
              value?: string;
            };
          };
        };
        ecs?: {
          properties: {
            version?: {
              type: string;
            };
          };
        };
      };
    };
  };
}

export async function getDataTelemetry(callCluster: LegacyAPICaller) {
  try {
    const index = [
      ...DATA_DATASETS_INDEX_PATTERNS_UNIQUE.map(({ pattern }) => pattern),
      '*-*-*-*', // Include new indexing strategy indices {type}-{dataset}-{namespace}-{rollover_counter}
    ];
    const [indexMappings, indexStats]: [IndexMappings, IndexStats] = await Promise.all([
      // GET */_mapping?filter_path=*.mappings._meta.beat,*.mappings.properties.ecs.properties.version.type,*.mappings.properties.dataset.properties.type.value,*.mappings.properties.dataset.properties.name.value
      callCluster('indices.getMapping', {
        index: '*', // Request all indices because filter_path already filters out the indices without any of those fields
        filterPath: [
          // _meta.beat tells the shipper
          '*.mappings._meta.beat',
          // Does it have `ecs.version` in the mappings? => It follows the ECS conventions
          '*.mappings.properties.ecs.properties.version.type',

          // Disable the fields below because they are still pending to be confirmed:
          // https://github.com/elastic/ecs/pull/845
          // TODO: Re-enable when the final fields are confirmed
          // // If `dataset.type` is a `constant_keyword`, it can be reported as a type
          // '*.mappings.properties.dataset.properties.type.value',
          // // If `dataset.name` is a `constant_keyword`, it can be reported as the dataset
          // '*.mappings.properties.dataset.properties.name.value',
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

    const indexNames = Object.keys({ ...indexMappings, ...indexStats?.indices });
    const indices = indexNames.map((name) => {
      const isECS = !!indexMappings[name]?.mappings?.properties.ecs?.properties.version?.type;
      const shipper = indexMappings[name]?.mappings?._meta?.beat;
      const datasetName = indexMappings[name]?.mappings?.properties.dataset?.properties.name?.value;
      const datasetType = indexMappings[name]?.mappings?.properties.dataset?.properties.type?.value;

      const stats = (indexStats?.indices || {})[name];
      if (stats) {
        return {
          name,
          datasetName,
          datasetType,
          shipper,
          isECS,
          docCount: stats.total?.docs?.count,
          sizeInBytes: stats.total?.store?.size_in_bytes,
        };
      }
      return { name, datasetName, datasetType, shipper, isECS };
    });
    return buildDataTelemetryPayload(indices);
  } catch (e) {
    return [];
  }
}
