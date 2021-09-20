/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { memoize } from 'lodash';

import { XYChartSeriesIdentifier, SeriesName } from '@elastic/charts';

import { VisConfig } from '../types';

function getSplitValues(
  splitAccessors: XYChartSeriesIdentifier['splitAccessors'],
  seriesAspects?: VisConfig['aspects']['series']
) {
  if (splitAccessors.size < 1) {
    return [];
  }

  const splitValues: Array<string | number> = [];
  splitAccessors.forEach((value, key) => {
    const split = (seriesAspects ?? []).find(({ accessor }) => accessor === key);
    splitValues.push(split?.formatter ? split?.formatter(value) : value);
  });
  return splitValues;
}

export const getSeriesNameFn = (aspects: VisConfig['aspects'], multipleY = false) =>
  memoize(({ splitAccessors, yAccessor }: XYChartSeriesIdentifier): SeriesName => {
    const splitValues = getSplitValues(splitAccessors, aspects.series);
    const yAccessorTitle = aspects.y.find(({ accessor }) => accessor === yAccessor)?.title ?? null;

    if (!yAccessorTitle) {
      return null;
    }

    if (multipleY) {
      if (splitValues.length === 0) {
        return yAccessorTitle;
      }
      return `${splitValues.join(' - ')}: ${yAccessorTitle}`;
    }

    return splitValues.length > 0 ? splitValues.join(' - ') : yAccessorTitle;
  });
