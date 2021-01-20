/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { CoreSetup, Plugin, UiSettingsParams } from 'kibana/server';

import { LEGACY_CHARTS_LIBRARY } from '../common';

export const uiSettingsConfig: Record<string, UiSettingsParams<boolean>> = {
  // TODO: Remove this when vis_type_vislib is removed
  // https://github.com/elastic/kibana/issues/56143
  [LEGACY_CHARTS_LIBRARY]: {
    name: i18n.translate('visTypeXy.advancedSettings.visualization.legacyChartsLibrary.name', {
      defaultMessage: 'Legacy charts library',
    }),
    value: false,
    description: i18n.translate(
      'visTypeXy.advancedSettings.visualization.legacyChartsLibrary.description',
      {
        defaultMessage:
          'Enables legacy charts library for area, line and bar charts in visualize. Currently, only legacy charts library supports split chart aggregation.',
      }
    ),
    category: ['visualization'],
    schema: schema.boolean(),
  },
};

export class VisTypeXyServerPlugin implements Plugin<object, object> {
  public setup(core: CoreSetup) {
    core.uiSettings.register(uiSettingsConfig);

    return {};
  }

  public start() {
    return {};
  }
}
