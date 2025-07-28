/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { IndicesAutocompleteResult, IndexAutocompleteItem } from '@kbn/esql-types';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { InferenceEndpointsAutocompleteResult } from '@kbn/esql-types';

export interface EsqlServiceOptions {
  client: ElasticsearchClient;
}

export class EsqlService {
  constructor(public readonly options: EsqlServiceOptions) {}

  protected async getIndexAliases(indices: string[]): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};
    const { client } = this.options;

    // Execute: GET /<index1,index2,...>/_alias
    interface AliasesResponse {
      [indexName: string]: {
        aliases: {
          [aliasName: string]: {};
        };
      };
    }
    const response = (await client.indices.getAlias({
      index: indices,
    })) as AliasesResponse;

    for (const [indexName, { aliases }] of Object.entries(response)) {
      const aliasNames = Object.keys(aliases ?? {});

      if (aliasNames.length > 0) {
        result[indexName] = aliasNames;
      }
    }

    return result;
  }

  public async getIndicesByIndexMode(
    mode: 'lookup' | 'time_series'
  ): Promise<IndicesAutocompleteResult> {
    const { client } = this.options;

    // Execute: GET /_all/_settings/index.mode,index.hidden,aliases?flat_settings=true
    interface IndexModeResponse {
      [indexName: string]: {
        settings: {
          'index.mode': string;
          'index.hidden': boolean;
        };
      };
    }
    const queryByIndexModeResponse = (await client.indices.getSettings({
      name: ['index.hidden', 'index.mode'],
      flat_settings: true,
    })) as IndexModeResponse;

    const indices: IndexAutocompleteItem[] = [];
    const indexNames: string[] = [];

    for (const [name, { settings }] of Object.entries(queryByIndexModeResponse)) {
      if (settings['index.mode'] === mode && !settings['index.hidden']) {
        indexNames.push(name);
        indices.push({ name, mode, aliases: [] });
      }
    }

    const aliases = await this.getIndexAliases(indexNames);

    for (const index of indices) {
      index.aliases = aliases[index.name] ?? [];
    }

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
