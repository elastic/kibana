/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { SeriesType } from '../types';

const errors = {
  markSizeAccessorForNonLineOrAreaChartsError: () =>
    i18n.translate(
      'expressionXY.reusable.function.dataLayer.errors.markSizeAccessorForNonLineOrAreaChartsError',
      {
        defaultMessage:
          "`markSizeAccessor` can't be used. Dots are applied only for line or area charts",
      }
    ),
  markSizeRatioLimitsError: () =>
    i18n.translate('expressionXY.reusable.function.xyVis.errors.markSizeLimitsError', {
      defaultMessage: 'Mark size ratio must be greater or equal to 1 and less or equal to 100',
    }),
};

export const validateMarkSizeForChartType = (
  markSizeAccessor: string | undefined,
  seriesType: SeriesType
) => {
  if (markSizeAccessor && !seriesType.includes('line') && !seriesType.includes('area')) {
    throw new Error(errors.markSizeAccessorForNonLineOrAreaChartsError());
  }
};

export const validateMarkSizeRatioLimits = (markSizeRatio: number) => {
  if (markSizeRatio < 1 || markSizeRatio > 100) {
    throw new Error(errors.markSizeRatioLimitsError());
  }
};
