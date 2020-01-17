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
import { IPulseElasticsearchClient } from './types';
import { IClusterClient } from '../../elasticsearch';

export class PulseElasticsearchClient implements IPulseElasticsearchClient {
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

  public async index(channel: string, doc: any) {
    const id = uuid.v4();
    await this.elasticsearch!.callAsInternalUser('index', {
      index: this.buildIndex(channel),
      id: `${id}`,
      body: doc,
    });
  }

  public async search<T>(channel: string, query: any) {
    const result = await this.elasticsearch.callAsInternalUser('search', {
      index: this.buildIndex(channel),
      body: { query },
    });
    return result.hits.hits.map(h => h._source as T);
  }

  private buildIndex(channel: string) {
    return `.kibana_pulse_local_${channel}`;
  }
}
