/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeSliderControlState, StoredTimeSliderExplicitInput } from '@kbn/controls-schemas';

export function snakeCaseTimeSlider(state: { [key: string]: unknown }): TimeSliderControlState {
  // all time slider keys are optional, so have to be a bit more broad here to check for versioning
  if (
    'isAnchored' in state ||
    'timesliceEndAsPercentageOfTimeRange' in state ||
    'timesliceStartAsPercentageOfTimeRange' in state
  ) {
    const {
      isAnchored,
      timesliceEndAsPercentageOfTimeRange,
      timesliceStartAsPercentageOfTimeRange,
    } = state as StoredTimeSliderExplicitInput;
    return {
      is_anchored: isAnchored,
      timeslice_end_as_percentage_of_time_range: timesliceEndAsPercentageOfTimeRange,
      timeslice_start_as_percentage_of_time_range: timesliceStartAsPercentageOfTimeRange,
    };
  } else {
    return state as TimeSliderControlState;
  }
}
