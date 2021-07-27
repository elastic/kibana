import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../core/server';

import { FieldFormatsPluginSetup, FieldFormatsPluginStart } from './types';
import { defineRoutes } from './routes';

export class FieldFormatsPlugin
  implements Plugin<FieldFormatsPluginSetup, FieldFormatsPluginStart> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('fieldFormats: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('fieldFormats: Started');
    return {};
  }

  public stop() {}
}
