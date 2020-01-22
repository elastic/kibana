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

export interface PulseInstruction {
  owner: string;
  id: string;
  value: unknown;
}

interface ChannelConfig<I = PulseInstruction> {
  id: string;
  instructions$: Subject<I[]>;
}

export class PulseChannel<I = PulseInstruction> {
  public readonly getRecords: () => Promise<Record<string, any>>;
  private readonly collector: any;
  constructor(private readonly config: ChannelConfig<I>, collector?: any) {
    this.collector = collector || require(`${__dirname}/collectors/${this.id}`);
    this.getRecords = this.collector.getRecords;
  }

  public get id() {
    return this.config.id;
  }

  public sendPulse<T = any>(payload: T) {
    if (!this.collector.putRecord) {
      throw Error(`this.collector.putRecord not implemented for ${this.id}.`);
    }
    this.collector.putRecord(payload);
  }

  public clearRecords(ids: string[]) {
    if (this.collector.clearRecords) {
      this.collector.clearRecords(ids);
    }
  }

  public instructions$() {
    return this.config.instructions$.asObservable();
  }
}
