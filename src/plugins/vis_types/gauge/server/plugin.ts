/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { CoreSetup, Plugin, UiSettingsParams } from 'kibana/server';

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

export class VisTypeGaugeServerPlugin implements Plugin<object, object> {
  public setup(core: CoreSetup) {
    core.uiSettings.register(getUiSettingsConfig());

    return {};
  }

  public start() {
    return {};
  }
}
