/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  IndicesAutocompleteResult,
  IndexAutocompleteItem,
  ResolveIndexResponse,
} from '@kbn/esql-types';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { InferenceEndpointsAutocompleteResult } from '@kbn/esql-types';
import { getListOfCCSIndices } from '../lookup/utils';

export interface EsqlServiceOptions {
  client: ElasticsearchClient;
}

export class EsqlService {
  constructor(public readonly options: EsqlServiceOptions) {}

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
      querystring: {
        mode,
      },
    })) as ResolveIndexResponse;

    sources.indices?.forEach((index) => {
      indices.push({ name: index.name, mode, aliases: index.aliases ?? [] });
    });

    const crossClusterCommonIndices = remoteClusters
      ? getListOfCCSIndices(remoteClustersArray, indices)
      : indices;

    const result: IndicesAutocompleteResult = {
      indices: crossClusterCommonIndices,
    };

    return result;
  }

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
