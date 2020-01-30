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

/*
  Minimized version of elasticsearch for Pulse that exposes methods to be used by Pulse services.
*/

import uuid from 'uuid';
import { IClusterClient } from '../../elasticsearch';

export interface PulseDocument {
  _id?: string;
  hash?: string;
}

export class PulseElasticsearchClient {
  constructor(private readonly elasticsearch: IClusterClient) {}

  public async createIndexIfNotExist(channel: string, mappings: Record<string, any>) {
    const exists = await this.elasticsearch!.callAsInternalUser('indices.exists', {
      index: this.buildIndex(channel),
    });
    if (!exists) {
      await this.elasticsearch!.callAsInternalUser('indices.create', {
        index: this.buildIndex(channel),
        body: {
          settings: {
            number_of_shards: 1,
          },
          mappings,
        },
      });
    }
  }

  public async index(channel: string, doc: PulseDocument | PulseDocument[]) {
    const records = Array.isArray(doc) ? doc : [doc];
    await this.elasticsearch.callAsInternalUser<any>('bulk', {
      body: records.reduce((acc, record) => {
        return [
          ...acc,
          {
            update: {
              _index: this.buildIndex(channel),
              _id: record._id || record.hash || uuid.v4(),
            },
          },
          { doc: record, doc_as_upsert: true },
        ];
      }, [] as object[]),
    });
  }

  public async search<T>(channel: string, query: any, options: any = {}) {
    const { body, ...rest } = options;
    const result = await this.elasticsearch.callAsInternalUser('search', {
      ignore_unavailable: true,
      allow_no_indices: true,
      ...rest,
      body: { query, ...body },
      index: this.buildIndex(channel),
    });
    return result.hits.hits.map(h => h._source as T);
  }

  private buildIndex(channel: string) {
    return `.kibana_pulse_local_${channel}`;
  }
}
