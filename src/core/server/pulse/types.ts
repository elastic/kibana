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
  Uncomment SavedObjects if a use case arises. For now, we're using an index pattern for storage.
*/
// import { SavedObjectsServiceSetup, ISavedObjectsRepository } from '../saved_objects';
import { Logger } from '../logging';
import { IPulseElasticsearchClient } from './client_wrappers/types';
import { IClusterClient } from '../elasticsearch';

export type PulseCollectorConstructor = new (logger: Logger) => PulseCollector;
export interface CollectorSetupContext {
  rawElasticsearch: IClusterClient;
  elasticsearch: IPulseElasticsearchClient;
  // savedObjects: SavedObjectsServiceSetup;
}

export abstract class PulseCollector<Payload = unknown, PulseRecord = Payload> {
  // protected savedObjects?: ISavedObjectsRepository;
  protected rawElasticsearch?: IClusterClient;
  protected elasticsearch?: IPulseElasticsearchClient;

  constructor(protected readonly logger: Logger) {}

  public abstract async putRecord(payload: Payload): Promise<void>;
  public abstract async getRecords(): Promise<PulseRecord[] | unknown[]>;

  public async setup(setupContext: CollectorSetupContext) {
    // this.savedObjects = setupContext.savedObjects.createInternalRepository();
    this.elasticsearch = setupContext.elasticsearch;
    this.rawElasticsearch = setupContext.rawElasticsearch;
  }
}
