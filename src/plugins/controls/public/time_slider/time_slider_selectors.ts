/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TimeSliderReduxState } from './types';
import {
  FROM_INDEX,
  TO_INDEX,
  roundDownToNextStepSizeFactor,
  roundUpToNextStepSizeFactor,
} from './time_utils';

export function getRoundedTimeRangeBounds(state: TimeSliderReduxState): [number, number] {
  const stepSize = state.componentState.stepSize;
  const timeRangeBounds = state.componentState.timeRangeBounds;
  return [
    roundDownToNextStepSizeFactor(timeRangeBounds[FROM_INDEX], stepSize),
    roundUpToNextStepSizeFactor(timeRangeBounds[TO_INDEX], stepSize),
  ];
}

export function getIsAnchored(state: TimeSliderReduxState): boolean {
  return typeof state.explicitInput.isAnchored === 'boolean'
    ? state.explicitInput.isAnchored
    : false;
}
