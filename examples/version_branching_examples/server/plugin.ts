import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../src/core/server';

import { VersionBranchingExamplesPluginSetup, VersionBranchingExamplesPluginStart } from './types';
import { defineRoutes } from './routes';

export class VersionBranchingExamplesPlugin
  implements Plugin<VersionBranchingExamplesPluginSetup, VersionBranchingExamplesPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('version_branching_examples: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router, core.version);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('version_branching_examples: Started');
    return {};
  }

  public stop() {}
}
