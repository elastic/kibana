/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IAxis } from './panel_utils';

export function generateTicksProvider() {
  function floorInBase(n: number, base: number) {
    return base * Math.floor(n / base);
  }

  function generateTicks(axis: IAxis) {
    const returnTicks = [];
    let tickSize = 2;
    let delta = axis.delta || 0;
    let steps = 0;
    let tickVal;
    let tickCount = 0;

    // Count the steps
    while (Math.abs(delta) >= 1024) {
      steps++;
      delta /= 1024;
    }

    // Set the tick size relative to the remaining delta
    while (tickSize <= 1024) {
      if (delta <= tickSize) {
        break;
      }
      tickSize *= 2;
    }
    axis.tickSize = tickSize * Math.pow(1024, steps);

    // Calculate the new ticks
    const tickMin = floorInBase(axis.min || 0, axis.tickSize);
    do {
      tickVal = tickMin + tickCount++ * axis.tickSize;
      returnTicks.push(tickVal);
    } while (tickVal < (axis.max || 0));

    return returnTicks;
  }

  return (axis: IAxis) => generateTicks(axis);
}
