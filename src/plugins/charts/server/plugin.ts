/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { CoreSetup, Plugin } from 'kibana/server';
import { COLOR_MAPPING_SETTING, LEGACY_TIME_AXIS, palette, systemPalette } from '../common';
import { ExpressionsServerSetup } from '../../expressions/server';

interface SetupDependencies {
  expressions: ExpressionsServerSetup;
}

export class ChartsServerPlugin implements Plugin<object, object> {
  public setup(core: CoreSetup, dependencies: SetupDependencies) {
    dependencies.expressions.registerFunction(palette);
    dependencies.expressions.registerFunction(systemPalette);
    core.uiSettings.register({
      [COLOR_MAPPING_SETTING]: {
        name: i18n.translate('charts.advancedSettings.visualization.colorMappingTitle', {
          defaultMessage: 'Color mapping',
        }),
        value: JSON.stringify({
          Count: '#00A69B',
        }),
        type: 'json',
        description: i18n.translate('charts.advancedSettings.visualization.colorMappingText', {
          defaultMessage:
            'Maps values to specific colors in charts using the <strong>Compatibility</strong> palette.',
        }),
        deprecation: {
          message: i18n.translate(
            'charts.advancedSettings.visualization.colorMappingTextDeprecation',
            {
              defaultMessage:
                'This setting is deprecated and will not be supported in a future version.',
            }
          ),
          docLinksKey: 'visualizationSettings',
        },
        category: ['visualization'],
        schema: schema.string(),
      },
      [LEGACY_TIME_AXIS]: {
        name: i18n.translate('charts.advancedSettings.visualization.useLegacyTimeAxis.name', {
          defaultMessage: 'Legacy chart time axis',
        }),
        value: false,
        description: i18n.translate(
          'charts.advancedSettings.visualization.useLegacyTimeAxis.description',
          {
            defaultMessage:
              'Enables the legacy time axis for charts in Lens, Discover, Visualize and TSVB',
          }
        ),
        category: ['visualization'],
        schema: schema.boolean(),
      },
    });

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
