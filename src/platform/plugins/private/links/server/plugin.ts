/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { SavedObjectLinksAttributes } from './saved_objects/schema/v1';
import { CONTENT_ID, LATEST_VERSION } from '../common';
import { LinksStorage } from './content_management';
import { linksSavedObjectType } from './saved_objects';
import { inject, extract } from './references';

export class LinksServerPlugin implements Plugin<object, object> {
  private readonly logger: Logger;

  constructor(private initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup,
    plugins: {
      contentManagement: ContentManagementServerSetup;
      embeddable: EmbeddableSetup;
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

    plugins.embeddable.registerEmbeddableFactory({
      id: CONTENT_ID,
      inject,
      extract,
    });

    core.savedObjects.registerType<SavedObjectLinksAttributes>(linksSavedObjectType);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
