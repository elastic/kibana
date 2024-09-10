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
import { GaugeConfig } from './config';

import { LEGACY_GAUGE_CHARTS_LIBRARY } from '../common';

export const getUiSettingsConfig: () => Record<string, UiSettingsParams<boolean>> = () => ({
  [LEGACY_GAUGE_CHARTS_LIBRARY]: {
    name: i18n.translate(
      'visTypeGauge.advancedSettings.visualization.legacyGaugeChartsLibrary.name',
      {
        defaultMessage: 'Gauge legacy charts library',
      }
    ),
    requiresPageReload: true,
    value: true,
    description: i18n.translate(
      'visTypeGauge.advancedSettings.visualization.legacyGaugeChartsLibrary.description',
      {
        defaultMessage: 'Enables legacy charts library for gauge charts in visualize.',
      }
    ),
    category: ['visualization'],
    schema: schema.boolean(),
  },
});

interface PluginSetupDependencies {
  visualizations: VisualizationsServerSetup;
}

export class VisTypeGaugeServerPlugin implements Plugin<object, object> {
  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: PluginSetupDependencies) {
    core.uiSettings.register(getUiSettingsConfig());

    const { readOnly } = this.initializerContext.config.get<GaugeConfig>();
    if (readOnly) {
      plugins.visualizations.registerReadOnlyVisType('gauge');
      plugins.visualizations.registerReadOnlyVisType('goal');
    }

    return {};
  }

  public start() {
    return {};
  }
}
