/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import { RefreshInterval } from '../../../../common';
import type { InputTimeRange } from '../types';

const valueOf = function (o: any) {
  if (o) return o.valueOf();
};

export function areRefreshIntervalsDifferent(rangeA: RefreshInterval, rangeB: RefreshInterval) {
  if (_.isObject(rangeA) && _.isObject(rangeB)) {
    if (
      valueOf(rangeA.value) !== valueOf(rangeB.value) ||
      valueOf(rangeA.pause) !== valueOf(rangeB.pause)
    ) {
      return true;
    }
  } else {
    return !_.isEqual(rangeA, rangeB);
  }

  return false;
}

export function areTimeRangesDifferent(rangeA: InputTimeRange, rangeB: InputTimeRange) {
  if (rangeA && rangeB && _.isObject(rangeA) && _.isObject(rangeB)) {
    if (
      valueOf(rangeA.to) !== valueOf(rangeB.to) ||
      valueOf(rangeA.from) !== valueOf(rangeB.from)
    ) {
      return true;
    }
  } else {
    return !_.isEqual(rangeA, rangeB);
  }

  return false;
}
