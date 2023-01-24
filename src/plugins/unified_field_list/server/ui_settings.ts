/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { UiSettingsParams } from '@kbn/core/server';
import { FIELD_EXISTENCE_SETTING } from '../common';

export const getUiSettings: () => Record<string, UiSettingsParams> = () => ({
  [FIELD_EXISTENCE_SETTING]: {
    name: i18n.translate('unifiedFieldList.advancedSettings.useFieldExistenceSampling.title', {
      defaultMessage: 'Use field existence sampling',
    }),
    value: false,
    description: i18n.translate(
      'unifiedFieldList.advancedSettings.useFieldExistenceSampling.description',
      {
        defaultMessage:
          'If enabled, document sampling is used to determine field existence (available or empty) for the Lens field list instead of relying on index mappings.',
      }
    ),
    deprecation: {
      message: i18n.translate(
        'unifiedFieldList.advancedSettings.useFieldExistenceSampling.deprecation',
        {
          defaultMessage: 'This setting is deprecated and will not be supported as of 8.6.',
        }
      ),
      docLinksKey: 'visualizationSettings',
    },
    category: ['visualization'],
    schema: schema.boolean(),
  },
});
