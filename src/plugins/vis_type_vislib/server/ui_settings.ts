/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { UiSettingsParams } from 'kibana/server';
import { DIMMING_OPACITY_SETTING, HEATMAP_MAX_BUCKETS_SETTING } from '../common';

export const uiSettings: Record<string, UiSettingsParams> = {
  // TODO: move this to vis_type_xy when vislib is removed
  // https://github.com/elastic/kibana/issues/56143
  [DIMMING_OPACITY_SETTING]: {
    name: i18n.translate('visTypeVislib.advancedSettings.visualization.dimmingOpacityTitle', {
      defaultMessage: 'Dimming opacity',
    }),
    value: 0.5,
    type: 'number',
    description: i18n.translate('visTypeVislib.advancedSettings.visualization.dimmingOpacityText', {
      defaultMessage:
        'The opacity of the chart items that are dimmed when highlighting another element of the chart. ' +
        'The lower this number, the more the highlighted element will stand out. ' +
        'This must be a number between 0 and 1.',
    }),
    category: ['visualization'],
    schema: schema.number(),
  },
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
};
