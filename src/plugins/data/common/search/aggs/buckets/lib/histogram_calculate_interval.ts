/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { isAutoInterval } from '../_interval_options';
import { ES_FIELD_TYPES } from '../../../../types';

interface IntervalValuesRange {
  min: number;
  max: number;
}

export interface CalculateHistogramIntervalParams {
  interval: number | string;
  maxBucketsUiSettings: number;
  maxBucketsUserInput?: number | '';
  esTypes: ES_FIELD_TYPES[];
  intervalBase?: number;
  values?: IntervalValuesRange;
}

/**
 * Round interval by order of magnitude to provide clean intervals
 */
const roundInterval = (minInterval: number) => {
  const orderOfMagnitude = Math.pow(10, Math.floor(Math.log10(minInterval)));
  let interval = orderOfMagnitude;

  while (interval < minInterval) {
    interval += orderOfMagnitude;
  }

  return interval;
};

const calculateForGivenInterval = (
  diff: number,
  interval: number,
  maxBucketsUiSettings: CalculateHistogramIntervalParams['maxBucketsUiSettings']
) => {
  const bars = diff / interval;

  if (bars > maxBucketsUiSettings) {
    const minInterval = diff / maxBucketsUiSettings;

    return roundInterval(minInterval);
  }

  return interval;
};

/**
 * Algorithm for determining auto-interval

   1. Define maxBars as Math.min(<user input>, <max buckets setting>)
   2. Find the min and max values in the data
   3. Subtract the min from max to get diff
   4. Set exactInterval to diff / maxBars
   5. Based on exactInterval, find the power of 10 that's lower and higher
   6. Find the number of expected buckets that lowerPower would create: diff / lowerPower
   7. Find the number of expected buckets that higherPower would create: diff / higherPower
   8. There are three possible final intervals, pick the one that's closest to maxBars:
     - The lower power of 10
     - The lower power of 10, times 2
     - The lower power of 10, times 5
 **/
const calculateAutoInterval = (diff: number, maxBars: number, esTypes: ES_FIELD_TYPES[]) => {
  const exactInterval = diff / maxBars;

  // For integer fields that are less than maxBars, we should use 1 as the value of interval
  // Elastic has 4 integer data types: long, integer, short, byte
  // see: https://www.elastic.co/guide/en/elasticsearch/reference/current/number.html
  if (
    diff < maxBars &&
    esTypes.every((esType) =>
      [
        ES_FIELD_TYPES.INTEGER,
        ES_FIELD_TYPES.LONG,
        ES_FIELD_TYPES.SHORT,
        ES_FIELD_TYPES.BYTE,
      ].includes(esType)
    )
  ) {
    return 1;
  }

  const lowerPower = Math.pow(10, Math.floor(Math.log10(exactInterval)));
  const autoBuckets = diff / lowerPower;

  if (autoBuckets > maxBars) {
    if (autoBuckets / 2 <= maxBars) {
      return lowerPower * 2;
    } else if (autoBuckets / 5 <= maxBars) {
      return lowerPower * 5;
    } else {
      return lowerPower * 10;
    }
  }

  return lowerPower;
};

export const calculateHistogramInterval = ({
  interval,
  maxBucketsUiSettings,
  maxBucketsUserInput,
  intervalBase,
  values,
  esTypes,
}: CalculateHistogramIntervalParams) => {
  const isAuto = isAutoInterval(interval);
  let calculatedInterval = isAuto
    ? 0
    : typeof interval !== 'number'
    ? parseFloat(interval)
    : interval;

  // should return NaN on non-numeric or invalid values
  if (Number.isNaN(calculatedInterval)) {
    return calculatedInterval;
  }

  if (values) {
    const diff = values.max - values.min;

    if (diff) {
      calculatedInterval = isAuto
        ? calculateAutoInterval(
            diff,

            // Mind maxBucketsUserInput can be an empty string, hence we need to ensure it here
            Math.min(maxBucketsUiSettings, maxBucketsUserInput || maxBucketsUiSettings),
            esTypes
          )
        : calculateForGivenInterval(diff, calculatedInterval, maxBucketsUiSettings);
    }
  }

  if (intervalBase) {
    if (calculatedInterval < intervalBase) {
      // In case the specified interval is below the base, just increase it to it's base
      calculatedInterval = intervalBase;
    } else if (calculatedInterval % intervalBase !== 0) {
      // In case the interval is not a multiple of the base round it to the next base
      calculatedInterval = Math.round(calculatedInterval / intervalBase) * intervalBase;
    }
  }

  const defaultValueForUnspecifiedInterval = 1;

  return calculatedInterval || defaultValueForUnspecifiedInterval;
};
