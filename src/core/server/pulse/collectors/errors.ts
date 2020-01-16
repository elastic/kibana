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
  errorId: string;
}

export class Collector extends PulseCollector<Payload> {
  private readonly channelName = 'errors';

  public async setup(deps: CollectorSetupContext) {
    await super.setup(deps);
    if (this.elasticsearch?.createIndexIfNotExist) {
      const mappings = {
        properties: {
          timestamp: {
            type: 'date',
          },
          errorId: {
            type: 'keyword',
          },
          message: {
            type: 'text',
            fields: {
              keyword: {
                type: 'keyword',
              },
            },
          },
        },
      };
      await this.elasticsearch!.createIndexIfNotExist(this.channelName, mappings);
    }
  }
  public async putRecord(originalPayload: Payload) {
    const payload = { timestamp: moment.utc().toISOString(), ...originalPayload };
    if (this.elasticsearch) await this.elasticsearch.index(this.channelName, payload);
  }

  public async getRecords() {
    if (this.elasticsearch) {
      const results = await this.elasticsearch.search(this.channelName, {
        bool: {
          filter: {
            range: {
              timestamp: {
                gte: 'now-10s',
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
