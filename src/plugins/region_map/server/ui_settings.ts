/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { UiSettingsParams } from 'kibana/server';
import { schema } from '@kbn/config-schema';

export function getUiSettings(): Record<string, UiSettingsParams<unknown>> {
  return {
    'visualization:regionmap:showWarnings': {
      name: i18n.translate('regionMap.advancedSettings.visualization.showRegionMapWarningsTitle', {
        defaultMessage: 'Show region map warning',
      }),
      value: true,
      description: i18n.translate(
        'regionMap.advancedSettings.visualization.showRegionMapWarningsText',
        {
          defaultMessage:
            'Whether the region map shows a warning when terms cannot be joined to a shape on the map.',
        }
      ),
      schema: schema.boolean(),
      category: ['visualization'],
    },
  };
}
