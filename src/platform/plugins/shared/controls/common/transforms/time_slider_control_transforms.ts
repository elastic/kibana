/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { StoredTimeSliderExplicitInput, TimeSliderControlState } from '@kbn/controls-schemas';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';

export const registerTimeSliderControlTransforms = (embeddable: EmbeddableSetup) => {
  embeddable.registerTransforms(TIME_SLIDER_CONTROL, {
    transformIn: (state: TimeSliderControlState) => {
      return {
        state: {
          isAnchored: state.is_anchored,
          timesliceEndAsPercentageOfTimeRange: state.timeslice_end_as_percentage_of_time_range,
          timesliceStartAsPercentageOfTimeRange: state.timeslice_start_as_percentage_of_time_range,
        } as StoredTimeSliderExplicitInput,
        references: [],
      };
    },
    transformOut: (
      state: StoredTimeSliderExplicitInput,
      panelReferences,
      containerReferences,
      id
    ): TimeSliderControlState => {
      return {
        is_anchored: state.isAnchored,
        timeslice_end_as_percentage_of_time_range: state.timesliceEndAsPercentageOfTimeRange,
        timeslice_start_as_percentage_of_time_range: state.timesliceStartAsPercentageOfTimeRange,
      };
    },
  });
};
