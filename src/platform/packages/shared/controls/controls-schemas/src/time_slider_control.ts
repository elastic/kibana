/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import { baseControlSchema, deprecatedDefaultControlState } from './control_schema';

export const timeSliderControlState = deprecatedDefaultControlState.extends({
  isAnchored: schema.maybe(schema.boolean()),
  // Encode value as percentage of time range to support relative time ranges.
  timesliceStartAsPercentageOfTimeRange: schema.maybe(
    schema.number({
      min: 0,
      meta: {
        description:
          'Start of the time slice as a value between 0 and 1 representing a percentage of the overall time range.',
      },
    })
  ),
  timesliceEndAsPercentageOfTimeRange: schema.maybe(
    schema.number({
      max: 1,
      meta: {
        description:
          'End of the time slice as a value between 0 and 1 representing a percentage of the overall time range.',
      },
    })
  ),
});

export const timeSliderControl = baseControlSchema.extends({
  type: schema.literal(TIME_SLIDER_CONTROL),
  controlConfig: timeSliderControlState,
});
