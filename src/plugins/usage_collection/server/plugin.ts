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
  CoreSetup,
  CoreStart,
  ISavedObjectsRepository,
  Plugin,
  UsageCollectionSetup,
} from 'kibana/server';
import { setupRoutes } from './routes';

/**
 * @deprecated Use core's usageCollection service instead.
 */
export type UsageCollectionPluginSetup = UsageCollectionSetup;

export class UsageCollectionPlugin implements Plugin<UsageCollectionPluginSetup> {
  private savedObjectsInternalRepository?: ISavedObjectsRepository;

  public async setup(core: CoreSetup) {
    // Keeping the ui-metrics and application_usage on the plugin for now
    const router = core.http.createRouter();
    setupRoutes(router, () => this.savedObjectsInternalRepository);

    // Pass-through to keep backwards compatibility for now
    return core.usageCollection;
  }

  public start({ savedObjects }: CoreStart) {
    this.savedObjectsInternalRepository = savedObjects.createInternalRepository();
  }

  public stop() {}
}
