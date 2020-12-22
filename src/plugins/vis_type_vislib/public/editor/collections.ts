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

import { colorSchemas } from '../../../charts/public';
import { getPositions, getScaleTypes } from '../../../vis_type_xy/public';

import { Alignment, GaugeType } from '../types';

export const getGaugeTypes = () => [
  {
    text: i18n.translate('visTypeVislib.gauge.gaugeTypes.arcText', {
      defaultMessage: 'Arc',
    }),
    value: GaugeType.Arc,
  },
  {
    text: i18n.translate('visTypeVislib.gauge.gaugeTypes.circleText', {
      defaultMessage: 'Circle',
    }),
    value: GaugeType.Circle,
  },
];

export const getAlignments = () => [
  {
    text: i18n.translate('visTypeVislib.gauge.alignmentAutomaticTitle', {
      defaultMessage: 'Automatic',
    }),
    value: Alignment.Automatic,
  },
  {
    text: i18n.translate('visTypeVislib.gauge.alignmentHorizontalTitle', {
      defaultMessage: 'Horizontal',
    }),
    value: Alignment.Horizontal,
  },
  {
    text: i18n.translate('visTypeVislib.gauge.alignmentVerticalTitle', {
      defaultMessage: 'Vertical',
    }),
    value: Alignment.Vertical,
  },
];

export const getGaugeCollections = () => ({
  gaugeTypes: getGaugeTypes(),
  alignments: getAlignments(),
  colorSchemas,
});

export const getHeatmapCollections = () => ({
  legendPositions: getPositions(),
  scales: getScaleTypes(),
  colorSchemas,
});
