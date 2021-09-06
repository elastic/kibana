/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment, { unitOfTime } from 'moment';

const findIntervalFromDuration = (
  dateValue: number,
  esValue: number,
  esUnit: unitOfTime.Base,
  timeZone: string
) => {
  const date = moment.tz(dateValue, timeZone);
  const startOfDate = moment.tz(date, timeZone).startOf(esUnit);
  const endOfDate = moment.tz(date, timeZone).startOf(esUnit).add(esValue, esUnit);
  return endOfDate.valueOf() - startOfDate.valueOf();
};

const getIntervalInMs = (
  value: number,
  esValue: number,
  esUnit: unitOfTime.Base,
  timeZone: string
): number => {
  switch (esUnit) {
    case 's':
      return 1000 * esValue;
    case 'ms':
      return 1 * esValue;
    default:
      return findIntervalFromDuration(value, esValue, esUnit, timeZone);
  }
};

export const getAdjustedInterval = (
  values: number[],
  esValue: number,
  esUnit: unitOfTime.Base,
  timeZone: string
): number => {
  const newInterval = values.reduce((minInterval, currentXvalue, index) => {
    let currentDiff = minInterval;

    if (index > 0) {
      currentDiff = Math.abs(values[index - 1] - currentXvalue);
    }

    const singleUnitInterval = getIntervalInMs(currentXvalue, esValue, esUnit, timeZone);
    return Math.min(minInterval, singleUnitInterval, currentDiff);
  }, Number.MAX_SAFE_INTEGER);

  return newInterval > 0 ? newInterval : moment.duration(esValue, esUnit).asMilliseconds();
};
