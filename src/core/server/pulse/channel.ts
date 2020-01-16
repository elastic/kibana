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
import { PulseCollectorConstructor } from './types';
// import { SavedObjectsServiceSetup } from '../saved_objects';
import { Logger } from '../logging';
import { IPulseElasticsearchClient, IPulseClient } from './clientWrappers/types';

export interface PulseInstruction {
  owner: string;
  id: string;
  value: unknown;
}

export interface ChannelConfig {
  id: string;
  instructions$: Subject<PulseInstruction>;
  logger: Logger;
}
export interface ChannelSetupContext {
  pulse?: IPulseClient;
  elasticsearch?: IPulseElasticsearchClient;
  // savedObjects: SavedObjectsServiceSetup;
}

export class PulseChannel<Payload = any, Rec = Payload> {
  private readonly collector: any;

  constructor(private readonly config: ChannelConfig) {
    const Collector: PulseCollectorConstructor = require(`${__dirname}/collectors/${this.id}`)
      .Collector;
    this.collector = new Collector(this.config.logger);
  }

  public async setup(setupContext: ChannelSetupContext) {
    return this.collector.setup(setupContext);
  }

  public async getRecords() {
    return this.collector.getRecords();
  }
  public get id() {
    return this.config.id;
  }

  public async sendPulse<T = any>(payload: T) {
    if (!this.collector.putRecord) {
      throw Error(`this.collector.putRecords not implemented for ${this.id}.`);
    }
    await this.collector.putRecord(payload);
  }

  public instructions$() {
    return this.config.instructions$.asObservable();
  }
}
