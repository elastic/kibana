/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';

import {
  SearchExamplesPluginSetup,
  SearchExamplesPluginStart,
  SearchExamplesPluginSetupDeps,
  SearchExamplesPluginStartDeps,
} from './types';
import { mySearchStrategyProvider } from './my_strategy';
import { registerRoutes } from './routes';
import { fibonacciStrategyProvider } from './fibonacci_strategy';

export class SearchExamplesPlugin
  implements
    Plugin<
      SearchExamplesPluginSetup,
      SearchExamplesPluginStart,
      SearchExamplesPluginSetupDeps,
      SearchExamplesPluginStartDeps
    >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<SearchExamplesPluginStartDeps>,
    deps: SearchExamplesPluginSetupDeps
  ) {
    this.logger.debug('search_examples: Setup');
    const router = core.http.createRouter<DataRequestHandlerContext>();

    core.getStartServices().then(([_, depsStart]) => {
      const myStrategy = mySearchStrategyProvider(depsStart.data);
      const fibonacciStrategy = fibonacciStrategyProvider();
      deps.data.search.registerSearchStrategy('myStrategy', myStrategy);
      deps.data.search.registerSearchStrategy('fibonacciStrategy', fibonacciStrategy);
      registerRoutes(router);
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('search_examples: Started');
    return {};
  }

  public stop() {}
}
