/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { CONTENT_ID, LATEST_VERSION } from '../common';
import { LinksAttributes } from '../common/content_management';
import { LinksStorage } from './content_management';
import { linksSavedObjectType } from './saved_objects';

export class LinksServerPlugin implements Plugin<object, object> {
  private readonly logger: Logger;

  constructor(private initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup,
    plugins: {
      contentManagement: ContentManagementServerSetup;
    }
  ) {
    plugins.contentManagement.register({
      id: CONTENT_ID,
      storage: new LinksStorage({
        throwOnResultValidationError: this.initializerContext.env.mode.dev,
        logger: this.logger.get('storage'),
      }),
      version: {
        latest: LATEST_VERSION,
      },
    });

    core.savedObjects.registerType<LinksAttributes>(linksSavedObjectType);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
