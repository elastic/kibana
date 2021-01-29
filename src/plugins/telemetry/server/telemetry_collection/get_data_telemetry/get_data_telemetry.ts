/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ElasticsearchClient } from 'src/core/server';

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
  data_stream?: {
    dataset?: string;
    type?: DataTelemetryType | string; // The union of types is to help autocompletion with some known `data_stream.type`s
  };
  package?: {
    name: string;
  };
  shipper?: string;
  pattern_name?: DataPatternName;
}

export type DataTelemetryPayload = DataTelemetryDocument[];

export interface DataTelemetryIndex {
  name: string;
  packageName?: string; // Populated by Ingest Manager at `_meta.package.name`
  managedBy?: string; // Populated by Ingest Manager at `_meta.managed_by`
  dataStreamDataset?: string; // To be obtained from `mappings.data_stream.dataset` if it's a constant keyword
  dataStreamType?: string; // To be obtained from `mappings.data_stream.type` if it's a constant keyword
  shipper?: string; // To be obtained from `_meta.beat` if it's set
  isECS?: boolean; // Optional because it can't be obtained via Monitoring.

  // The fields below are optional because we might not be able to obtain them if the user does not
  // have access to the index.
  docCount?: number;
  sizeInBytes?: number;
}

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

type DataDescriptor = AtLeastOne<{
  packageName: string;
  dataStreamDataset: string;
  dataStreamType: string;
  shipper: string;
  patternName: DataPatternName; // When found from the list of the index patterns
}>;

function findMatchingDescriptors({
  name,
  shipper,
  packageName,
  managedBy,
  dataStreamDataset,
  dataStreamType,
}: DataTelemetryIndex): DataDescriptor[] {
  // If we already have the data from the indices' mappings...
  if (
    [shipper, packageName].some(Boolean) ||
    (managedBy === 'ingest-manager' && [dataStreamType, dataStreamDataset].some(Boolean))
  ) {
    return [
      {
        ...(shipper && { shipper }),
        ...(packageName && { packageName }),
        ...(dataStreamDataset && { dataStreamDataset }),
        ...(dataStreamType && { dataStreamType }),
      } as AtLeastOne<{
        packageName: string;
        dataStreamDataset: string;
        dataStreamType: string;
        shipper: string;
      }>, // Using casting here because TS doesn't infer at least one exists from the if clause
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
        !name.startsWith('.ds-') && // data_stream-related indices can be included
        !startingDotPatternsUntilTheFirstAsterisk.find((pattern) => name.startsWith(pattern))
      )
  );

  const acc = new Map<string, DataTelemetryDocument>();

  for (const indexCandidate of indexCandidates) {
    const matchingDescriptors = findMatchingDescriptors(indexCandidate);
    for (const {
      dataStreamDataset,
      dataStreamType,
      packageName,
      shipper,
      patternName,
    } of matchingDescriptors) {
      const key = `${dataStreamDataset}-${dataStreamType}-${packageName}-${shipper}-${patternName}`;
      acc.set(key, {
        ...((dataStreamDataset || dataStreamType) && {
          data_stream: { dataset: dataStreamDataset, type: dataStreamType },
        }),
        ...(packageName && { package: { name: packageName } }),
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

        // Ingest Manager provided metadata
        package?: {
          name?: string;
        };
        managed_by?: string; // Typically "ingest-manager"
      };
      properties: {
        data_stream?: {
          properties: {
            dataset?: {
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

export async function getDataTelemetry(esClient: ElasticsearchClient) {
  try {
    const index = [
      ...DATA_DATASETS_INDEX_PATTERNS_UNIQUE.map(({ pattern }) => pattern),
      '*-*-*', // Include data-streams aliases `{type}-{dataset}-{namespace}`
    ];
    const indexMappingsParams: { index: string; filter_path: string[] } = {
      // GET */_mapping?filter_path=*.mappings._meta.beat,*.mappings.properties.ecs.properties.version.type,*.mappings.properties.dataset.properties.type.value,*.mappings.properties.dataset.properties.name.value
      index: '*', // Request all indices because filter_path already filters out the indices without any of those fields
      filter_path: [
        // _meta.beat tells the shipper
        '*.mappings._meta.beat',
        // _meta.package.name tells the Ingest Manager's package
        '*.mappings._meta.package.name',
        // _meta.managed_by is usually populated by Ingest Manager for the UI to identify it
        '*.mappings._meta.managed_by',
        // Does it have `ecs.version` in the mappings? => It follows the ECS conventions
        '*.mappings.properties.ecs.properties.version.type',

        // If `data_stream.type` is a `constant_keyword`, it can be reported as a type
        '*.mappings.properties.data_stream.properties.type.value',
        // If `data_stream.dataset` is a `constant_keyword`, it can be reported as the dataset
        '*.mappings.properties.data_stream.properties.dataset.value',
      ],
    };
    const indicesStatsParams: {
      index: string | string[] | undefined;
      level: 'cluster' | 'indices' | 'shards' | undefined;
      metric: string[];
      filter_path: string[];
    } = {
      // GET <index>/_stats/docs,store?level=indices&filter_path=indices.*.total
      index,
      level: 'indices',
      metric: ['docs', 'store'],
      filter_path: ['indices.*.total'],
    };
    const [{ body: indexMappings }, { body: indexStats }] = await Promise.all([
      esClient.indices.getMapping<IndexMappings>(indexMappingsParams),
      esClient.indices.stats<IndexStats>(indicesStatsParams),
    ]);

    const indexNames = Object.keys({ ...indexMappings, ...indexStats?.indices });

    const indices = indexNames.map((name) => {
      const baseIndexInfo = {
        name,
        isECS: !!indexMappings[name]?.mappings?.properties.ecs?.properties.version?.type,
        shipper: indexMappings[name]?.mappings?._meta?.beat,
        packageName: indexMappings[name]?.mappings?._meta?.package?.name,
        managedBy: indexMappings[name]?.mappings?._meta?.managed_by,
        dataStreamDataset:
          indexMappings[name]?.mappings?.properties.data_stream?.properties.dataset?.value,
        dataStreamType:
          indexMappings[name]?.mappings?.properties.data_stream?.properties.type?.value,
      };

      const stats = (indexStats?.indices || {})[name];
      if (stats) {
        return {
          ...baseIndexInfo,
          docCount: stats.total?.docs?.count,
          sizeInBytes: stats.total?.store?.size_in_bytes,
        };
      }
      return baseIndexInfo;
    });
    return buildDataTelemetryPayload(indices);
  } catch (e) {
    return [];
  }
}
