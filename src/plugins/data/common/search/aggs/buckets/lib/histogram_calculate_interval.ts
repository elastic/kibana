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

import { isAutoInterval } from '../_interval_options';

interface IntervalValuesRange {
  min: number;
  max: number;
}

export interface CalculateHistogramIntervalParams {
  interval: string;
  maxBucketsUiSettings: number;
  maxBucketsUserInput?: number;
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
  values: IntervalValuesRange,
  interval: number,
  maxBucketsUiSettings: CalculateHistogramIntervalParams['maxBucketsUiSettings']
) => {
  const diff = values.max - values.min;
  const bars = diff / interval;

  if (bars > maxBucketsUiSettings) {
    const minInterval = diff / maxBucketsUiSettings;

    return roundInterval(minInterval);
  }

  return interval;
};

const calculateAutoInterval = (
  values: IntervalValuesRange,
  maxBucketsUiSettings: CalculateHistogramIntervalParams['maxBucketsUiSettings'],
  maxBucketsUserInput: CalculateHistogramIntervalParams['maxBucketsUserInput']
) => {
  const getMaxFractionalPart = (...numbers: number[]) => {
    return numbers.reduce((acc, n) => {
      const [, value] = n.toString().split('.');
      return value && value.length > acc ? value.length : acc;
    }, 0);
  };

  const diff = values.max - values.min;
  let autoBuckets: number = 0;

  if (!maxBucketsUserInput) {
    const fractalFactor = Math.pow(10, getMaxFractionalPart(values.min, values.max));

    autoBuckets = diff * fractalFactor;

    if (autoBuckets > maxBucketsUiSettings) {
      autoBuckets =
        (Math.log10(maxBucketsUiSettings) / Math.log10(autoBuckets)) * maxBucketsUiSettings;
    }

    // For float numbers we can try to increase interval
    if (fractalFactor > 1 && autoBuckets < maxBucketsUiSettings / 2) {
      autoBuckets = autoBuckets * 5;
      if (autoBuckets > maxBucketsUiSettings) {
        autoBuckets = autoBuckets * 2;
      }
    }
  }

  const bars = Math.min(maxBucketsUiSettings, maxBucketsUserInput || autoBuckets || 1);

  return roundInterval(diff / bars);
};

export const calculateHistogramInterval = ({
  interval,
  maxBucketsUiSettings,
  maxBucketsUserInput,
  intervalBase,
  values,
}: CalculateHistogramIntervalParams) => {
  const isAuto = isAutoInterval(interval);
  let calculatedInterval = 0;

  if (values) {
    calculatedInterval = isAuto
      ? calculateAutoInterval(values, maxBucketsUiSettings, maxBucketsUserInput)
      : calculateForGivenInterval(values, parseFloat(interval), maxBucketsUiSettings);
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

  return calculatedInterval;
};
