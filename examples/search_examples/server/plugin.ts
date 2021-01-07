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
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import {
  SearchExamplesPluginSetup,
  SearchExamplesPluginStart,
  SearchExamplesPluginSetupDeps,
  SearchExamplesPluginStartDeps,
} from './types';
import { mySearchStrategyProvider } from './my_strategy';
import { registerRoutes } from './routes';

export class SearchExamplesPlugin
  implements
    Plugin<
      SearchExamplesPluginSetup,
      SearchExamplesPluginStart,
      SearchExamplesPluginSetupDeps,
      SearchExamplesPluginStartDeps
    > {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<SearchExamplesPluginStartDeps>,
    deps: SearchExamplesPluginSetupDeps
  ) {
    this.logger.debug('search_examples: Setup');
    const router = core.http.createRouter();

    core.getStartServices().then(([_, depsStart]) => {
      const myStrategy = mySearchStrategyProvider(depsStart.data);
      deps.data.search.registerSearchStrategy('myStrategy', myStrategy);
      registerRoutes(router, depsStart.data);
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('search_examples: Started');
    return {};
  }

  public stop() {}
}
