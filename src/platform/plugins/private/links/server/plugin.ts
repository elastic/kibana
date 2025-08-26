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
import { CONTENT_ID, LATEST_VERSION, LINKS_EMBEDDABLE_TYPE } from '../common';
import type { LinksState } from './content_management';
import { LinksStorage } from './content_management';
import { linksSavedObjectType } from './saved_objects';
import { transforms } from '../common/embeddable/transforms/transforms';

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

    core.savedObjects.registerType<LinksState>(linksSavedObjectType);

    plugins.embeddable.registerTransforms(LINKS_EMBEDDABLE_TYPE, transforms);

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
