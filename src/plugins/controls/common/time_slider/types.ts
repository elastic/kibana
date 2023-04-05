/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ControlInput } from '../types';

export const TIME_SLIDER_CONTROL = 'timeSlider';

export interface TimeSliderControlEmbeddableInput extends ControlInput {
  isAnchored?: boolean;
  // Encode value as percentage of time range to support relative time ranges.
  timesliceStartAsPercentageOfTimeRange?: number;
  timesliceEndAsPercentageOfTimeRange?: number;
}
