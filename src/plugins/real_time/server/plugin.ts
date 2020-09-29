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
  Logger,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  IContextProvider,
  RequestHandler,
} from '../../../../src/core/server';
import { opsSavedObjectType } from './saved_objects';
import { RealTimeRequestHandlerContext } from './types';
import { RealTimeJsonClientProvider } from './json';
import { RealTimeRpc } from './rpc';
import { setupRoutes } from './router';

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface RealTimePluginSetupDependencies {}

export interface RealTimePluginStartDependencies {}

export interface RealTimePluginSetup {}

export interface RealTimePluginStart {}
/* eslint-enable @typescript-eslint/no-empty-interface */

export class RealTimePlugin
  implements
    Plugin<
      RealTimePluginSetup,
      RealTimePluginStart,
      RealTimePluginSetupDependencies,
      RealTimePluginStartDependencies
    > {
  private readonly logger: Logger;
  private jsonClientProvider?: RealTimeJsonClientProvider;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('plugins', 'tags');
  }

  public setup(
    core: CoreSetup<RealTimePluginStartDependencies, unknown>,
    plugins: RealTimePluginSetupDependencies
  ): RealTimePluginSetup {
    const { logger } = this;
    const { http, savedObjects } = core;

    this.logger.debug('setup()');

    this.jsonClientProvider = new RealTimeJsonClientProvider({ logger });

    savedObjects.registerType(opsSavedObjectType);

    const router = http.createRouter();

    http.registerRouteHandlerContext('realTime', this.createRouteHandlerContext(core, plugins));
    setupRoutes({ router });

    return {};
  }

  public start(core: CoreStart, plugins: RealTimePluginStartDependencies): RealTimePluginStart {
    this.logger.debug('start()');

    return {};
  }

  private createRouteHandlerContext = (
    setupCore: CoreSetup,
    setupPlugins: RealTimePluginSetupDependencies
  ): IContextProvider<RequestHandler<unknown, unknown, unknown>, 'realTime'> => {
    return async (context, request) => {
      const [core] = await setupCore.getStartServices();
      const { savedObjects } = core;
      const savedObjectsClient = savedObjects.getScopedClient(request);
      const params = {
        savedObjectsClient,
      };
      const jsonClient = this.jsonClientProvider!.create(params);
      const rpc = new RealTimeRpc({ logger: this.logger, savedObjectsClient, jsonClient });
      const tagsContext: RealTimeRequestHandlerContext = {
        jsonClient,
        rpc,
      };

      return tagsContext;
    };
  };
}
