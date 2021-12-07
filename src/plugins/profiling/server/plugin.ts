import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../core/server';

import type { DataRequestHandlerContext } from '../../data/server';

import {
  ProfilingPluginSetup,
  ProfilingPluginStart,
  ProfilingPluginSetupDeps,
  ProfilingPluginStartDeps,
} from './types';
import { mySearchStrategyProvider } from './my_strategy';
import { registerRoutes } from './routes';

export class ProfilingPlugin
  implements
    Plugin<
      ProfilingPluginSetup,
      ProfilingPluginStart,
      ProfilingPluginSetupDeps,
      ProfilingPluginStartDeps
      >
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  /*public setup(core: CoreSetup) {
    this.logger.debug('profiling: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }*/

  public setup(
    core: CoreSetup<ProfilingPluginStartDeps>,
    deps: ProfilingPluginSetupDeps
  ) {
    this.logger.debug('profiling: Setup');
    const router = core.http.createRouter<DataRequestHandlerContext>();

    core.getStartServices().then(([_, depsStart]) => {
      const myStrategy = mySearchStrategyProvider(depsStart.data);
      deps.data.search.registerSearchStrategy('myStrategy', myStrategy);
      registerRoutes(router);
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('profiling: Started');
    return {};
  }

  public stop() {}

}
