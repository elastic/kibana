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

import { PulseCollector, CollectorSetupContext } from '../types';

export interface Payload {
  records: NotificationInstruction[];
  deploymentId: string;
}

export interface NotificationInstruction {
  hash: string;
  title: string;
  status: 'new' | 'seen';
  description: string;
  linkUrl: string;
  linkText: string;
  badge: string;
  publishOn: string;
  expireOn: string;
  seenOn: string;
}

function flatMap<T, X>(arr: T[], foldMethod: (x: T) => X | X[]): X[] {
  return arr.reduce((acc, x) => acc.concat(foldMethod(x)), [] as X[]);
}

export class Collector extends PulseCollector {
  private readonly channelName = 'notifications';
  private readonly indexName = '.kibana_pulse_local_notifications';
  public async putRecord(payload: Payload) {
    if (this.rawElasticsearch) {
      await this.rawElasticsearch.callAsInternalUser<any>('bulk', {
        // index: this.indexName,
        body: flatMap(payload.records, record => {
          return [
            { update: { _index: this.indexName, _id: record.hash } },
            { doc: record, doc_as_upsert: true },
          ];
        }),
      });
    }
  }

  public async setup(setupContext: CollectorSetupContext) {
    await super.setup(setupContext);
    if (this.elasticsearch?.createIndexIfNotExist) {
      const mappings = {
        properties: {
          publishOn: { type: 'date' },
        },
      };
      await this.elasticsearch!.createIndexIfNotExist(this.channelName, mappings);
    }
  }

  public async getRecords(): Promise<NotificationInstruction[]> {
    if (this.rawElasticsearch) {
      const result = await this.rawElasticsearch.callAsInternalUser<NotificationInstruction>(
        'search',
        {
          index: this.indexName,
          ignoreUnavailable: true,
          body: {
            sort: [
              {
                publishOn: {
                  order: 'desc',
                },
              },
            ],
          },
        }
      );

      return result.hits.hits.map(hit => {
        return hit._source;
      });
    }

    return [];
  }
}
