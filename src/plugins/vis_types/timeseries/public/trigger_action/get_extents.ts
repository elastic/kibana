/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Panel, Series } from '../../common/types';

const lowerBoundShouldBeZero = (
  lowerBound: number | null,
  upperBound: number | null,
  hasBarAreaChart: boolean
) => {
  return (hasBarAreaChart && lowerBound && lowerBound > 0) || (upperBound && upperBound < 0);
};

const computeBounds = (series: Series, lowerBound: number | null, upperBound: number | null) => {
  if (!lowerBound) {
    lowerBound = Number(series.axis_min);
  } else if (Number(series.axis_min) < lowerBound) {
    lowerBound = Number(series.axis_min);
  }

  if (!upperBound) {
    upperBound = Number(series.axis_max);
  } else if (Number(series.axis_max) > upperBound) {
    upperBound = Number(series.axis_max);
  }

  return { lowerBound, upperBound };
};

const getLowerValue = (
  minValue: number | null,
  maxValue: number | null,
  hasBarOrAreaRight: boolean
) => {
  return lowerBoundShouldBeZero(minValue, maxValue, hasBarOrAreaRight) ? 0 : minValue;
};

/*
 * In TSVB the user can have different axis with different bounds.
 * In Lens, we only allow 2 axis, one left and one right. We need an assumption here.
 * We will transfer in Lens the  "collapsed" axes with both bounds.
 */
export const getYExtents = (model: Panel) => {
  let lowerBoundLeft: number | null = null;
  let upperBoundLeft: number | null = null;
  let lowerBoundRight: number | null = null;
  let upperBoundRight: number | null = null;
  let ignoreGlobalSettingsLeft = false;
  let ignoreGlobalSettingsRight = false;
  let hasBarOrAreaLeft = false;
  let hasBarOrAreaRight = false;

  model.series.forEach((s) => {
    if (s.axis_position === 'left') {
      if (s.chart_type !== 'line' || (s.chart_type === 'line' && Number(s.fill) > 0)) {
        hasBarOrAreaLeft = true;
      }
      if (s.separate_axis) {
        ignoreGlobalSettingsLeft = true;
        const { lowerBound, upperBound } = computeBounds(s, lowerBoundLeft, upperBoundLeft);
        lowerBoundLeft = lowerBound;
        upperBoundLeft = upperBound;
      }
    }
    if (s.axis_position === 'right' && s.separate_axis) {
      if (s.chart_type !== 'line' || (s.chart_type === 'line' && Number(s.fill) > 0)) {
        hasBarOrAreaRight = true;
      }
      if (s.separate_axis) {
        ignoreGlobalSettingsRight = true;
        const { lowerBound, upperBound } = computeBounds(s, lowerBoundRight, upperBoundRight);
        lowerBoundRight = lowerBound;
        upperBoundRight = upperBound;
      }
    }
  });

  const finalLowerBoundLeft = ignoreGlobalSettingsLeft
    ? getLowerValue(lowerBoundLeft, upperBoundLeft, hasBarOrAreaLeft)
    : model.axis_position === 'left'
    ? getLowerValue(Number(model.axis_min), Number(model.axis_max), hasBarOrAreaLeft)
    : null;

  const finalUpperBoundLeft = ignoreGlobalSettingsLeft
    ? upperBoundLeft
    : model.axis_position === 'left'
    ? model.axis_max
    : null;

  const finalLowerBoundRight = ignoreGlobalSettingsRight
    ? getLowerValue(lowerBoundRight, upperBoundRight, hasBarOrAreaRight)
    : model.axis_position === 'right'
    ? model.axis_min
    : null;
  const finalUpperBoundRight = ignoreGlobalSettingsRight
    ? upperBoundRight
    : model.axis_position === 'right'
    ? getLowerValue(Number(model.axis_min), Number(model.axis_max), hasBarOrAreaRight)
    : null;
  return {
    yLeftExtent: {
      ...(finalLowerBoundLeft && {
        lowerBound: Number(finalLowerBoundLeft),
      }),
      ...(finalUpperBoundLeft && { upperBound: Number(finalUpperBoundLeft) }),
      mode: finalLowerBoundLeft || finalUpperBoundLeft ? 'custom' : 'full',
    },
    yRightExtent: {
      ...(finalLowerBoundRight && {
        lowerBound: Number(finalUpperBoundRight),
      }),
      ...(finalUpperBoundRight && { upperBound: Number(finalUpperBoundRight) }),
      mode: finalLowerBoundRight || finalUpperBoundRight ? 'custom' : 'full',
    },
  };
};
