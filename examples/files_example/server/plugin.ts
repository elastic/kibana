/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import { exampleFileKind } from '../common';
import type { FilesExamplePluginsSetup, FilesExamplePluginsStart } from './types';

export class FilesExamplePlugin
  implements Plugin<unknown, unknown, FilesExamplePluginsSetup, FilesExamplePluginsStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, { files }: FilesExamplePluginsSetup) {
    this.logger.debug('filesExample: Setup');

    files.registerFileKind(exampleFileKind);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('filesExample: Started');
    return {};
  }

  public stop() {}
}
