/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { CoreSetup, Plugin } from 'kibana/server';
import { COLOR_MAPPING_SETTING, palette, systemPalette } from '../common';
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
            'Maps values to specific colors in <strong>Visualize</strong> charts and <strong>TSVB</strong>. This setting does not apply to <strong>Lens.</strong>',
        }),
        deprecation: {
          message: i18n.translate(
            'charts.advancedSettings.visualization.colorMappingTextDeprecation',
            {
              defaultMessage: 'This setting is deprecated and will not be supported as of 8.0.',
            }
          ),
          docLinksKey: 'visualizationSettings',
        },
        category: ['visualization'],
        schema: schema.string(),
      },
    });

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
