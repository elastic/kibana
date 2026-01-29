/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { TimeSliderControlState } from '@kbn/controls-schemas';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';

interface StoredTimeSliderExplicitInput {
  isAnchored?: boolean;
  timesliceEndAsPercentageOfTimeRange?: number;
  timesliceStartAsPercentageOfTimeRange?: number;
}

export const registerTimeSliderControlTransforms = (embeddable: EmbeddableSetup) => {
  embeddable.registerTransforms(TIME_SLIDER_CONTROL, {
    transformOut: <
      StoredStateType extends Partial<StoredTimeSliderExplicitInput & TimeSliderControlState>
    >(
      state: StoredStateType
    ): TimeSliderControlState => {
      const {
        isAnchored,
        is_anchored,
        /**
         * Pre 9.4, we had long camelCased names to store the time slider selections. This
         * transform out renames them from...
         * - timesliceEndAsPercentageOfTimeRange -> end_percentage_of_time_range
         * - timesliceStartAsPercentageOfTimeRange -> start_percentage_of_time_range
         */
        timesliceEndAsPercentageOfTimeRange,
        end_percentage_of_time_range,
        timesliceStartAsPercentageOfTimeRange,
        start_percentage_of_time_range,
      } = state;
      return {
        ...(typeof isAnchored === 'boolean' && { is_anchored: isAnchored }),
        ...(typeof is_anchored === 'boolean' && { is_anchored }),
        ...(typeof timesliceEndAsPercentageOfTimeRange === 'number' && {
          end_percentage_of_time_range: timesliceEndAsPercentageOfTimeRange,
        }),
        ...(typeof end_percentage_of_time_range === 'number' && {
          end_percentage_of_time_range,
        }),
        ...(typeof timesliceStartAsPercentageOfTimeRange === 'number' && {
          start_percentage_of_time_range: timesliceStartAsPercentageOfTimeRange,
        }),
        ...(typeof start_percentage_of_time_range === 'number' && {
          start_percentage_of_time_range,
        }),
      };
    },
  });
};
