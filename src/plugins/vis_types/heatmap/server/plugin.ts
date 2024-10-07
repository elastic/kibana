/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { CoreSetup, Plugin, PluginInitializerContext, UiSettingsParams } from '@kbn/core/server';
import type { VisualizationsServerSetup } from '@kbn/visualizations-plugin/server';
import { HeatmapConfig } from './config';

import { LEGACY_HEATMAP_CHARTS_LIBRARY } from '../common';

export const getUiSettingsConfig: () => Record<string, UiSettingsParams<boolean>> = () => ({
  // TODO: Remove this when vislib heatmap is removed
  [LEGACY_HEATMAP_CHARTS_LIBRARY]: {
    name: i18n.translate(
      'visTypeHeatmap.advancedSettings.visualization.legacyHeatmapChartsLibrary.name',
      {
        defaultMessage: 'Heatmap legacy charts library',
      }
    ),
    requiresPageReload: true,
    value: false,
    description: i18n.translate(
      'visTypeHeatmap.advancedSettings.visualization.legacyHeatmapChartsLibrary.description',
      {
        defaultMessage: 'Enables legacy charts library for heatmap charts in visualize.',
      }
    ),
    deprecation: {
      message: i18n.translate(
        'visTypeHeatmap.advancedSettings.visualization.legacyHeatmapChartsLibrary.deprecation',
        {
          defaultMessage:
            'The legacy charts library for heatmap in visualize is deprecated and will not be supported in a future version.',
        }
      ),
      docLinksKey: 'visualizationSettings',
    },
    category: ['visualization'],
    schema: schema.boolean(),
  },
});

interface PluginSetupDependencies {
  visualizations: VisualizationsServerSetup;
}

export class VisTypeHeatmapServerPlugin implements Plugin<object, object> {
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: PluginSetupDependencies) {
    core.uiSettings.register(getUiSettingsConfig());

    const { readOnly } = this.initializerContext.config.get<HeatmapConfig>();
    if (readOnly) {
      plugins.visualizations.registerReadOnlyVisType('heatmap');
    }

    return {};
  }

  public start() {
    return {};
  }
}
