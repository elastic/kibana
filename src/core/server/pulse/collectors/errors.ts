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

import { PulseCollector, CollectorSetupContext } from '../types';

export interface Payload {
  errorId: string;
}

export class Collector extends PulseCollector<Payload> {
  private payloads: Payload[] = [];
  private readonly indexName = '.kibana_pulse_errors';

  public async setup(deps: CollectorSetupContext) {
    await super.setup(deps);
    const exists = await this.elasticsearch!.callAsInternalUser('indices.exists', {
      index: this.indexName,
    });
    if (!exists) {
      await this.elasticsearch!.callAsInternalUser('indices.create', {
        index: this.indexName,
        body: {
          settings: {
            number_of_shards: 1,
          },
          mappings: {
            properties: {
              errorId: {
                type: 'keyword',
              },
            },
          },
        },
      });
    }
  }
  public async putRecord(payload: Payload) {
    this.payloads.push(payload);
    if (this.elasticsearch) {
      await this.elasticsearch.callAsInternalUser('create', {
        index: this.indexName,
        body: payload,
      });
    }
  }

  public async getRecords() {
    if (this.elasticsearch) {
      const results = await this.elasticsearch.callAsInternalUser('search', {
        index: this.indexName,
      });
      // TODO: Set results as sent and return them
    }
    return this.payloads.splice(0, this.payloads.length);
  }
}
