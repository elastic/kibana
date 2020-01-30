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

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ChannelConfig, PulseInstruction } from '../../server/pulse/channel';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { PulseInstruction, ChannelConfig } from '../../server/pulse/channel';

export class PulseChannel<I = PulseInstruction> {
  private readonly stop$ = new Subject();
  constructor(private readonly config: ChannelConfig<I>) {}

  public async sendPulse<T = any | any[]>(doc: T) {
    const records = Array.isArray(doc) ? doc : [doc];
    await fetch(`/api/pulse_local/${this.config.id}`, {
      method: 'post',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'true',
      },
      body: JSON.stringify({
        payload: {
          records,
          deployment_id: '123',
        },
      }),
    });
  }

  public clearRecords(ids: string[]) {
    // not implemented yet
  }

  public async getRecords() {
    const response = await fetch(`/api/pulse_local/${this.config.id}`, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'true',
      },
    });
    if (response.body) {
      return response.json();
    } else {
      return [];
    }
  }

  public get id() {
    return this.config.id;
  }

  public instructions$() {
    return this.config.instructions$.pipe(takeUntil(this.stop$));
  }

  public stop() {
    this.stop$.next();
    this.config.instructions$.complete();
  }
}
