/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { Observable } from 'rxjs';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../core/server';

import { VISUALIZE_ENABLE_LABS_SETTING, LEGACY_CHARTS_LIBRARY } from '../common/constants';

import { visualizationSavedObjectType } from './saved_objects';

import { VisualizationsPluginSetup, VisualizationsPluginStart } from './types';
import { registerVisualizationsCollector } from './usage_collector';

export class VisualizationsPlugin
  implements Plugin<VisualizationsPluginSetup, VisualizationsPluginStart> {
  private readonly logger: Logger;
  private readonly config: Observable<{ kibana: { index: string } }>;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.legacy.globalConfig$;
  }

  public setup(core: CoreSetup, plugins: { usageCollection?: UsageCollectionSetup }) {
    this.logger.debug('visualizations: Setup');

    core.savedObjects.registerType(visualizationSavedObjectType);

    core.uiSettings.register({
      [VISUALIZE_ENABLE_LABS_SETTING]: {
        name: i18n.translate('visualizations.advancedSettings.visualizeEnableLabsTitle', {
          defaultMessage: 'Enable experimental visualizations',
        }),
        value: true,
        description: i18n.translate('visualizations.advancedSettings.visualizeEnableLabsText', {
          defaultMessage: `Allows users to create, view, and edit experimental visualizations. If disabled,
            only visualizations that are considered production-ready are available to the user.`,
        }),
        category: ['visualization'],
        schema: schema.boolean(),
      },
      // TODO: Remove this when vis_type_vislib is removed
      // https://github.com/elastic/kibana/issues/56143
      [LEGACY_CHARTS_LIBRARY]: {
        name: i18n.translate(
          'visualizations.advancedSettings.visualization.legacyChartsLibrary.name',
          {
            defaultMessage: 'Legacy charts library',
          }
        ),
        value: false,
        description: i18n.translate(
          'visualizations.advancedSettings.visualization.legacyChartsLibrary.description',
          {
            defaultMessage:
              'Enables legacy charts library for area, line and bar charts in visualize. Currently, only legacy charts library supports split chart aggregation.',
          }
        ),
        category: ['visualization'],
        schema: schema.boolean(),
      },
    });

    if (plugins.usageCollection) {
      registerVisualizationsCollector(plugins.usageCollection, this.config);
    }

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('visualizations: Started');
    return {};
  }

  public stop() {}
}
