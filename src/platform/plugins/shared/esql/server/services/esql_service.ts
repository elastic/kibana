/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { JoinIndexAutocompleteItem, JoinIndicesAutocompleteResult } from '../../common';

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

  public async getJoinIndices(): Promise<JoinIndicesAutocompleteResult> {
    const { client } = this.options;

    // Execute: GET /_all/_settings/index.mode,aliases?flat_settings=true
    interface IndexModeResponse {
      [indexName: string]: {
        settings: {
          'index.mode': string;
        };
      };
    }
    const queryByIndexModeResponse = (await client.indices.getSettings({
      name: 'index.mode',
      flat_settings: true,
    })) as IndexModeResponse;

    const indices: JoinIndexAutocompleteItem[] = [];
    const indexNames: string[] = [];

    for (const [name, { settings }] of Object.entries(queryByIndexModeResponse)) {
      if (settings['index.mode'] === 'lookup') {
        indexNames.push(name);
        indices.push({ name, mode: 'lookup', aliases: [] });
      }
    }

    const aliases = await this.getIndexAliases(indexNames);

    for (const index of indices) {
      index.aliases = aliases[index.name] ?? [];
    }

    const result: JoinIndicesAutocompleteResult = {
      indices,
    };

    return result;
  }
}
