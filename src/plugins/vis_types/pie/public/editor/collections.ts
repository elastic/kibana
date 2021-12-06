/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { DONUT_INNER_AREA_SIZE } from './constants';
import { LabelPositions, ValueFormats } from '../types';

export const getLabelPositions = [
  {
    text: i18n.translate('visTypePie.labelPositions.insideText', {
      defaultMessage: 'Inside',
    }),
    value: LabelPositions.INSIDE,
  },
  {
    text: i18n.translate('visTypePie.labelPositions.insideOrOutsideText', {
      defaultMessage: 'Inside or outside',
    }),
    value: LabelPositions.DEFAULT,
  },
];

export const getValuesFormats = [
  {
    text: i18n.translate('visTypePie.valuesFormats.percent', {
      defaultMessage: 'Show percent',
    }),
    value: ValueFormats.PERCENT,
  },
  {
    text: i18n.translate('visTypePie.valuesFormats.value', {
      defaultMessage: 'Show value',
    }),
    value: ValueFormats.VALUE,
  },
];

export const donutInnerAreaSizeOptions = [
  {
    id: 'donutInnerAreaSizeOption-small',
    value: DONUT_INNER_AREA_SIZE.SMALL,
    label: i18n.translate('visTypePie.donutInnerAreaSizeOptions.small', {
      defaultMessage: 'Small',
    }),
  },
  {
    id: 'donutInnerAreaSizeOption-medium',
    value: DONUT_INNER_AREA_SIZE.MEDIUM,
    label: i18n.translate('visTypePie.donutInnerAreaSizeOptions.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    id: 'donutInnerAreaSizeOption-large',
    value: DONUT_INNER_AREA_SIZE.LARGE,
    label: i18n.translate('visTypePie.donutInnerAreaSizeOptions.large', {
      defaultMessage: 'Large',
    }),
  },
];
