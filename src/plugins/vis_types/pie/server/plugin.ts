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

import { LEGACY_PIE_CHARTS_LIBRARY } from '../common';

export const getUiSettingsConfig: () => Record<string, UiSettingsParams<boolean>> = () => ({
  // TODO: Remove this when vislib pie is removed
  // https://github.com/elastic/kibana/issues/111246
  [LEGACY_PIE_CHARTS_LIBRARY]: {
    name: i18n.translate('visTypePie.advancedSettings.visualization.legacyPieChartsLibrary.name', {
      defaultMessage: 'Pie legacy charts library',
    }),
    requiresPageReload: true,
    value: false,
    description: i18n.translate(
      'visTypePie.advancedSettings.visualization.legacyPieChartsLibrary.description',
      {
        defaultMessage: 'Enables legacy charts library for pie charts in visualize.',
      }
    ),
    deprecation: {
      message: i18n.translate(
        'visTypePie.advancedSettings.visualization.legacyPieChartsLibrary.deprecation',
        {
          defaultMessage:
            'The legacy charts library for pie in visualize is deprecated and will not be supported in a future version.',
        }
      ),
      docLinksKey: 'visualizationSettings',
    },
    category: ['visualization'],
    schema: schema.boolean(),
  },
});

export class VisTypePieServerPlugin implements Plugin<object, object> {
  public setup(core: CoreSetup) {
    core.uiSettings.register(getUiSettingsConfig());

    return {};
  }

  public start() {
    return {};
  }
}
