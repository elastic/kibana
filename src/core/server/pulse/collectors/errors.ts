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

// getRecords should return an array of one or more telemetry
// records for the errors channel. Each record will ultimately
// be stored as an individual document in the errors channel index
// by the service
import moment from 'moment';
import { PulseCollector, CollectorSetupContext } from '../types';

export interface Payload {
  deploymentId: string;
  records: Array<Omit<ErrorPayloadValue, 'channel_id' | 'deployment_id'>>;
}
export interface ErrorPayloadValue {
  channel_id: string;
  currentKibanaVersion?: string;
  deployment_id: string;
  hash: string;
  fixedVersion?: string;
  message: string;
  status: 'new' | 'seen';
  timestamp: Date;
}

export class Collector extends PulseCollector<Payload> {
  private readonly channelName = 'errors';

  public async setup(deps: CollectorSetupContext) {
    await super.setup(deps);
    if (this.elasticsearch?.createIndexIfNotExist) {
      const mappings = {
        properties: {
          channel_id: {
            type: 'keyword',
          },
          currentKibanaVersion: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
          deployment_id: {
            type: 'keyword',
          },
          hash: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
          id: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
                ignore_above: 256,
              },
            },
          },
          message: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
          status: {
            type: 'keyword',
          },
          timestamp: {
            type: 'date',
          },
          fixedVersion: {
            type: 'keyword',
          },
        },
      };
      await this.elasticsearch!.createIndexIfNotExist(this.channelName, mappings);
    }
  }
  public async putRecord(originalPayload: Payload | Payload[]) {
    const payloads = Array.isArray(originalPayload) ? originalPayload : [originalPayload];
    await Promise.all(
      payloads.reduce((promises, payload) => {
        return [
          ...promises,
          ...payload.records.map(async record => {
            if (!record.hash) {
              throw Error(`error payload does not contain hash: ${JSON.stringify(record)}.`);
            }
            if (this.elasticsearch) {
              await this.elasticsearch.index(this.channelName, {
                ...record,
                channel_id: 'errors',
                deployment_id: '123',
                status: record.status || 'new',
                id: record.hash,
                timestamp: record.timestamp,
              });
            }
          }),
        ];
      }, [] as Array<Promise<void>>)
    );
  }

  public async getRecords() {
    if (this.elasticsearch) {
      const results = await this.elasticsearch.search(this.channelName, {
        bool: {
          should: [{ match: { status: 'new' } }],
          filter: {
            range: {
              timestamp: {
                gte: 'now-20s',
                lte: 'now',
              },
            },
          },
        },
      });
      return results;
    }
    return [];
  }
}
