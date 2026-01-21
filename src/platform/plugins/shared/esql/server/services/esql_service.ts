/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type IndicesAutocompleteResult,
  type IndexAutocompleteItem,
  type ResolveIndexResponse,
  SOURCES_TYPES,
} from '@kbn/esql-types';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { ESQLSourceResult, InferenceEndpointsAutocompleteResult } from '@kbn/esql-types';
import { getListOfCCSIndices } from '../lookup/utils';

export interface EsqlServiceOptions {
  client: ElasticsearchClient;
}

export class EsqlService {
  constructor(public readonly options: EsqlServiceOptions) {}

  /**
   * Get indices by their mode (lookup or time_series).
   * @param mode The mode to filter indices by.
   * @param remoteClusters Optional comma-separated list of remote clusters to include.
   * @returns A promise that resolves to the indices autocomplete result.
   */
  public async getIndicesByIndexMode(
    mode: 'lookup' | 'time_series',
    remoteClusters?: string
  ): Promise<IndicesAutocompleteResult> {
    const { client } = this.options;

    const indices: IndexAutocompleteItem[] = [];

    const sourcesToQuery = ['*'];
    const remoteClustersArray: string[] = [];
    if (remoteClusters) {
      remoteClustersArray.push(...remoteClusters.split(','));
      // attach a wildcard * for each remoteCluster
      const clustersArray = remoteClustersArray.map((cluster) => `${cluster.trim()}:*`);
      sourcesToQuery.push(...clustersArray);
    }

    // It doesn't return hidden indices
    const sources = (await client.indices.resolveIndex({
      name: sourcesToQuery,
      expand_wildcards: 'open',
      mode,
    })) as ResolveIndexResponse;

    sources.indices?.forEach((index) => {
      indices.push({ name: index.name, mode, aliases: index.aliases ?? [] });
    });

    sources.data_streams?.forEach((dataStream) => {
      indices.push({ name: dataStream.name, mode, aliases: dataStream.aliases ?? [] });
    });

    const crossClusterCommonIndices = remoteClusters
      ? getListOfCCSIndices(remoteClustersArray, indices)
      : indices;

    const result: IndicesAutocompleteResult = {
      indices: crossClusterCommonIndices,
    };

    return result;
  }

  /**
   * Get all indices, aliases, and data streams for ES|QL sources autocomplete.
   * @param scope The scope to retrieve indices for (local or all).
   * @returns A promise that resolves to an array of ESQL source results.
   */
  public async getAllIndices(scope: 'local' | 'all' = 'local'): Promise<ESQLSourceResult[]> {
    const { client } = this.options;

    // All means local + remote indices (queried with <cluster>:*)
    const namesToQuery = scope === 'local' ? ['*'] : ['*', '*:*'];

    // hidden and not, important for finding timeseries mode
    // mode is not returned for time_series datastreams, we need to find it from the indices
    // which are usually hidden
    const [allSources, availableSources] = (await Promise.all([
      client.indices.resolveIndex({
        name: namesToQuery,
        expand_wildcards: 'all', // this returns hidden indices too
      }),
      client.indices.resolveIndex({
        name: namesToQuery,
        expand_wildcards: 'open',
      }),
    ])) as [ResolveIndexResponse, ResolveIndexResponse];

    const suggestedIndices = this.processSuggestedIndices(availableSources.indices ?? []);
    const suggestedAliases = this.processSuggestedAliases(availableSources.aliases ?? []);
    const suggestedDataStreams = this.processSuggestedDataStreams(
      availableSources.data_streams ?? [],
      allSources.indices
    );

    return [...suggestedIndices, ...suggestedAliases, ...suggestedDataStreams];
  }

  private getIndexSourceType(mode?: string): SOURCES_TYPES {
    const modeTypeMap: Record<string, SOURCES_TYPES> = {
      time_series: SOURCES_TYPES.TIMESERIES,
      lookup: SOURCES_TYPES.LOOKUP,
    };

    return modeTypeMap[mode ?? ''] || SOURCES_TYPES.INDEX;
  }

  private processSuggestedIndices(indices: ResolveIndexResponse['indices']): ESQLSourceResult[] {
    return (
      indices?.map((index) => {
        // for remote clusters the format is cluster:indexName
        const [_, indexName] = index.name.split(':');
        return {
          name: index.name,
          type: this.getIndexSourceType(index.mode),
          // Extra hidden flag to flag system indices in the UI
          hidden: indexName?.startsWith('.') || index.name.startsWith('.'),
        };
      }) ?? []
    );
  }

  private processSuggestedAliases(aliases: ResolveIndexResponse['aliases']): ESQLSourceResult[] {
    return (
      aliases?.map((alias) => {
        // for remote clusters the format is cluster:aliasName
        const [_, aliasName] = alias.name.split(':');
        return {
          name: alias.name,
          type: SOURCES_TYPES.ALIAS,
          // Extra hidden flag to flag system aliases in the UI
          hidden: aliasName?.startsWith('.') || alias.name.startsWith('.'),
        };
      }) ?? []
    );
  }

  private processSuggestedDataStreams(
    dataStreams: ResolveIndexResponse['data_streams'],
    indices: ResolveIndexResponse['indices']
  ): ESQLSourceResult[] {
    const indexModeMap = new Map(indices?.map((idx) => [idx.name, idx.mode]) ?? []);

    return (
      dataStreams?.map((dataStream) => {
        const backingIndices = dataStream.backing_indices || [];
        // Determine if any of the backing indices are time_series
        const isTimeSeries = backingIndices.some(
          (indexName) => indexModeMap.get(indexName) === 'time_series'
        );
        return {
          name: dataStream.name,
          type: isTimeSeries ? SOURCES_TYPES.TIMESERIES : SOURCES_TYPES.DATA_STREAM,
          // Extra hidden flag to flag system data streams in the UI
          hidden: dataStream.name.startsWith('.'),
        };
      }) ?? []
    );
  }

  /**
   * Get inference endpoints for a specific task type.
   * @param taskType The type of inference task to retrieve endpoints for.
   * @returns A promise that resolves to the inference endpoints autocomplete result.
   */
  public async getInferenceEndpoints(
    taskType: InferenceTaskType
  ): Promise<InferenceEndpointsAutocompleteResult> {
    const { client } = this.options;

    const { endpoints } = await client.inference.get({
      inference_id: '_all',
      task_type: taskType,
    });

    return {
      inferenceEndpoints: endpoints.map((endpoint) => ({
        inference_id: endpoint.inference_id,
        task_type: endpoint.task_type,
      })),
    };
  }
}
