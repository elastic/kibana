/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { capabilitiesProvider } from './capabilities_provider';
import { VisualizationsStorage } from './content_management';

import type { VisualizationsPluginSetup, VisualizationsPluginStart } from './types';
import { makeVisualizeEmbeddableFactory } from './embeddable/make_visualize_embeddable_factory';
import { getVisualizationSavedObjectType } from './saved_objects';
import { CONTENT_ID, LATEST_VERSION } from '../common/content_management';

export class VisualizationsPlugin
  implements Plugin<VisualizationsPluginSetup, VisualizationsPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup,
    plugins: {
      embeddable: EmbeddableSetup;
      data: DataPluginSetup;
      contentManagement: ContentManagementServerSetup;
    }
  ) {
    this.logger.debug('visualizations: Setup');

    const getSearchSourceMigrations = plugins.data.search.searchSource.getAllMigrations.bind(
      plugins.data.search.searchSource
    );
    core.savedObjects.registerType(getVisualizationSavedObjectType(getSearchSourceMigrations));
    core.capabilities.registerProvider(capabilitiesProvider);

    plugins.embeddable.registerEmbeddableFactory(
      makeVisualizeEmbeddableFactory(getSearchSourceMigrations)()
    );

    plugins.contentManagement.register({
      id: CONTENT_ID,
      storage: new VisualizationsStorage(),
      version: {
        latest: LATEST_VERSION,
      },
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('visualizations: Started');
    return {};
  }

  public stop() {}
}
