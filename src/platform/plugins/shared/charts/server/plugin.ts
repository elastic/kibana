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
import { CoreSetup, Plugin } from '@kbn/core/server';
import { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { LEGACY_TIME_AXIS, palette, systemPalette } from '../common';

interface SetupDependencies {
  expressions: ExpressionsServerSetup;
}

export class ChartsServerPlugin implements Plugin<object, object> {
  public setup(core: CoreSetup, dependencies: SetupDependencies) {
    dependencies.expressions.registerFunction(palette);
    dependencies.expressions.registerFunction(systemPalette);
    core.uiSettings.register({
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
        deprecation: {
          message: i18n.translate(
            'charts.advancedSettings.visualization.useLegacyTimeAxis.deprecation',
            {
              defaultMessage:
                'This setting is deprecated and will not be supported in a future version.',
            }
          ),
          docLinksKey: 'visualizationSettings',
        },
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
