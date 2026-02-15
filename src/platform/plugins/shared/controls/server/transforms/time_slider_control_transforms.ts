/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import type {
  LegacyStoredTimeSliderExplicitInput,
  TimeSliderControlState,
} from '@kbn/controls-schemas';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { convertCamelCasedKeysToSnakeCase } from '@kbn/presentation-publishing';

export const registerTimeSliderControlTransforms = (embeddable: EmbeddableSetup) => {
  embeddable.registerTransforms(TIME_SLIDER_CONTROL, {
    getTransforms: () => ({
      transformOut: <
        StoredStateType extends Partial<
          LegacyStoredTimeSliderExplicitInput & TimeSliderControlState
        >
      >(
        state: StoredStateType
      ): TimeSliderControlState => {
        /**
         * Pre 9.4 the control state was stored in camelCase; these transforms ensure they are converted to snake_case
         */
        const {
          is_anchored,
          timeslice_start_as_percentage_of_time_range,
          timeslice_end_as_percentage_of_time_range,
          start_percentage_of_time_range,
          end_percentage_of_time_range,
        } = convertCamelCasedKeysToSnakeCase(
          state as LegacyStoredTimeSliderExplicitInput & TimeSliderControlState
        );
        return {
          is_anchored,
          /**
           * Pre 9.4, we had long camelCased names to store the time slider selections. This
           * transform out renames them from...
           * - timesliceEndAsPercentageOfTimeRange -> end_percentage_of_time_range
           * - timesliceStartAsPercentageOfTimeRange -> start_percentage_of_time_range
           */
          start_percentage_of_time_range:
            start_percentage_of_time_range ?? timeslice_start_as_percentage_of_time_range,
          end_percentage_of_time_range:
            timeslice_end_as_percentage_of_time_range ?? end_percentage_of_time_range,
        };
      },
    }),
  });
};
