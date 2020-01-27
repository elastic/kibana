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

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ChannelConfig } from 'src/core/server/pulse/channel';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { PulseClient } from './client_wrappers/pulse';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { PulseInstruction, PulseErrorInstructionValue } from '../../server/pulse/channel';

export class PulseChannel<Payload = any> {
  private readonly stop$ = new Subject();
  private readonly pulseClient: PulseClient;

  constructor(private readonly config: ChannelConfig) {
    this.pulseClient = new PulseClient();
  }

  public async getRecords() {
    return await this.pulseClient.getRecords(this.id);
  }

  public get id() {
    return this.config.id;
  }

  public async sendPulse<T = any>(payload: T) {
    await this.pulseClient.putRecord(this.id, payload);
  }

  public instructions$() {
    return this.config.instructions$.pipe(takeUntil(this.stop$));
  }

  public stop() {
    this.stop$.next();
    this.config.instructions$.complete();
  }
}
