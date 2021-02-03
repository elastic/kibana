/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
    const incrementInMs = moment.duration(increment, incrementedUnit).asMilliseconds();
    return currentMoment.startOf(incrementedUnit).toDate().getTime() + incrementInMs;
  } else {
    return currentTime + interval.asMilliseconds();
  }
};
