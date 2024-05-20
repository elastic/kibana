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
import { HEATMAP_MAX_BUCKETS_SETTING } from '../common';

export const getUiSettings: () => Record<string, UiSettingsParams> = () => ({
  [HEATMAP_MAX_BUCKETS_SETTING]: {
    name: i18n.translate('visTypeVislib.advancedSettings.visualization.heatmap.maxBucketsTitle', {
      defaultMessage: 'Heatmap maximum buckets',
    }),
    value: 50,
    type: 'number',
    description: i18n.translate(
      'visTypeVislib.advancedSettings.visualization.heatmap.maxBucketsText',
      {
        defaultMessage:
          'The maximum number of buckets a single datasource can return. ' +
          'A higher number might have negative impact on browser rendering performance',
      }
    ),
    category: ['visualization'],
    schema: schema.number(),
  },
});
