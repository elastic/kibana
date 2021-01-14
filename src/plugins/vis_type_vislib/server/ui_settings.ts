/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { UiSettingsParams } from 'kibana/server';
import {
  DIMMING_OPACITY_SETTING,
  HEATMAP_MAX_BUCKETS_SETTING,
  LEGACY_CHARTS_LIBRARY,
} from '../common';

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
  // TODO: Remove this when vis_type_vislib is removed
  // https://github.com/elastic/kibana/issues/56143
  [LEGACY_CHARTS_LIBRARY]: {
    name: i18n.translate('visTypeVislib.advancedSettings.visualization.legacyChartsLibrary.name', {
      defaultMessage: 'Legacy charts library',
    }),
    value: false,
    description: i18n.translate(
      'visTypeVislib.advancedSettings.visualization.legacyChartsLibrary.description',
      {
        defaultMessage:
          'Enables legacy charts library for area, line and bar charts in visualize. Currently, only legacy charts library supports split chart aggregation.',
      }
    ),
    category: ['visualization'],
    schema: schema.boolean(),
  },
};
