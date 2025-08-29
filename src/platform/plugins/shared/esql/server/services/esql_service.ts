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

export interface EsqlServiceOptions {
  client: ElasticsearchClient;
}

export class EsqlService {
  constructor(public readonly options: EsqlServiceOptions) {}

  public async getIndicesByIndexMode(
    mode: 'lookup' | 'time_series'
  ): Promise<IndicesAutocompleteResult> {
    const { client } = this.options;

    const indices: IndexAutocompleteItem[] = [];
    const indexNames: string[] = [];

    // It doesn't return hidden indices
    const sources = (await client.indices.resolveIndex({
      name: '*',
      expand_wildcards: 'open',
    })) as ResolveIndexResponse;

    sources.indices?.forEach((index) => {
      if (index.mode === mode) {
        indices.push({ name: index.name, mode, aliases: index.aliases ?? [] });
        indexNames.push(index.name);
      }
    });

    const result: IndicesAutocompleteResult = {
      indices,
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
