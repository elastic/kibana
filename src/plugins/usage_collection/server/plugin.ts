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

import {
  PluginInitializerContext,
  Logger,
  CoreSetup,
  CoreStart,
  ISavedObjectsRepository,
  Plugin,
  UsageCollectionSetup,
} from 'kibana/server';
import { setupRoutes } from './routes';

export class UsageCollectionPlugin implements Plugin<UsageCollectionSetup> {
  private readonly logger: Logger;
  private savedObjects?: ISavedObjectsRepository;
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup) {
    const router = core.http.createRouter();
    setupRoutes(router, () => this.savedObjects);

    return core.usageCollection;
  }

  public start({ savedObjects, elasticsearch }: CoreStart) {
    this.logger.debug('Starting plugin');
    this.savedObjects = savedObjects.createInternalRepository();
  }

  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
