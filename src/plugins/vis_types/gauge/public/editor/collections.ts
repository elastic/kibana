/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { colorSchemas } from '@kbn/charts-plugin/public';
import { Alignment, GaugeType } from '../types';

export const getGaugeTypes = () => [
  {
    text: i18n.translate('visTypeGauge.gauge.gaugeTypes.arcText', {
      defaultMessage: 'Arc',
    }),
    value: GaugeType.Arc,
  },
  {
    text: i18n.translate('visTypeGauge.gauge.gaugeTypes.circleText', {
      defaultMessage: 'Circle',
    }),
    value: GaugeType.Circle,
  },
];

export const getAlignments = () => [
  {
    text: i18n.translate('visTypeGauge.gauge.alignmentAutomaticTitle', {
      defaultMessage: 'Automatic',
    }),
    value: Alignment.Automatic,
  },
  {
    text: i18n.translate('visTypeGauge.gauge.alignmentHorizontalTitle', {
      defaultMessage: 'Horizontal',
    }),
    value: Alignment.Horizontal,
  },
  {
    text: i18n.translate('visTypeGauge.gauge.alignmentVerticalTitle', {
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
