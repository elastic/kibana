/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_RANGE_SLIDER_STATE } from '@kbn/controls-constants';
import type { RangeSliderControlState } from '@kbn/controls-schemas';
import type { SerializedStateComparison, StateComparators } from '@kbn/presentation-publishing';
import { dataControlComparators } from './data_control_state_comparison';

export const rangeSliderEditorComparators: StateComparators<Pick<RangeSliderControlState, 'step'>> =
  {
    step: (a, b) =>
      (a ?? DEFAULT_RANGE_SLIDER_STATE.step) === (b ?? DEFAULT_RANGE_SLIDER_STATE.step),
  };

export const rangeSliderStateComparison: SerializedStateComparison<RangeSliderControlState> = {
  comparators: {
    ...rangeSliderEditorComparators,
    ...dataControlComparators,
    value: 'deepEquality',
  },
};
