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

import { IPulseElasticsearchClient } from './client_wrappers/types';

export interface PulseInstruction {
  owner: string;
  id: string;
  value: unknown;
}

export interface ChannelConfig<I = PulseInstruction> {
  id: string;
  instructions$: Subject<I[]>;
  logger: Logger;
}

export interface ChannelSetupContext {
  elasticsearch: IPulseElasticsearchClient;
  // savedObjects: SavedObjectsServiceSetup;
}

export class PulseChannel<I = PulseInstruction> {
  private readonly collector: any;
  constructor(private readonly config: ChannelConfig<I>) {
    const Collector: PulseCollectorConstructor = require(`${__dirname}/collectors/${this.id}`)
      .Collector;
    this.collector = new Collector(this.config.logger);
  }

  public async setup(setupContext: ChannelSetupContext) {
    return this.collector.setup(setupContext);
  }

  public async getRecords(): Promise<Record<string, any>> {
    return this.collector.getRecords();
  }

  public get id() {
    return this.config.id;
  }

  public clearRecords(ids: string[]) {
    if (this.collector.clearRecords) {
      this.collector.clearRecords(ids);
    }
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
