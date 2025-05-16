/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment, { Duration } from 'moment-timezone';
import { getHighestTimeUnit } from './utils';

/**
 * Return the next rollout time, given current time and rollout interval
 */
export const getNextRollingTime = (
  currentTime: number,
  interval: Duration,
  modulate: boolean
): number => {
  if (modulate) {
    const incrementedUnit = getHighestTimeUnit(interval);
    const currentMoment = moment(currentTime);
    const increment =
      interval.get(incrementedUnit) -
      (currentMoment.get(incrementedUnit) % interval.get(incrementedUnit));
    const nextRollingMoment = currentMoment
      .startOf(incrementedUnit)
      .add(increment, incrementedUnit);
    return nextRollingMoment.toDate().getTime();
  } else {
    return currentTime + interval.asMilliseconds();
  }
};
