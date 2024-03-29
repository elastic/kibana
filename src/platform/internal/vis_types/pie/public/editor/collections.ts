/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  LabelPositions,
  ValueFormats,
  EmptySizeRatios,
} from '@kbn/expression-partition-vis-plugin/common';

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

export const emptySizeRatioOptions = [
  {
    id: 'emptySizeRatioOption-small',
    value: EmptySizeRatios.SMALL,
    label: i18n.translate('visTypePie.emptySizeRatioOptions.small', {
      defaultMessage: 'Small',
    }),
  },
  {
    id: 'emptySizeRatioOption-medium',
    value: EmptySizeRatios.MEDIUM,
    label: i18n.translate('visTypePie.emptySizeRatioOptions.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    id: 'emptySizeRatioOption-large',
    value: EmptySizeRatios.LARGE,
    label: i18n.translate('visTypePie.emptySizeRatioOptions.large', {
      defaultMessage: 'Large',
    }),
  },
];
