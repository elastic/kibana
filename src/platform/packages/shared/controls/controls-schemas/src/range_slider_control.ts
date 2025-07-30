/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';
import { baseControlSchema, dataControlState } from './control_schema';

export const rangeValue = schema.arrayOf(schema.string(), {
  minSize: 2,
  maxSize: 2,
  validate: (value) => {
    if (value.length !== 2) {
      return 'Range slider value must be an array with exactly two elements.';
    }
    if (isNaN(+value[0]) || isNaN(+value[1])) {
      return 'Range slider values must be valid numbers.';
    }
    if (+value[0] >= +value[1]) {
      return 'The first value must be less than the second value in the range slider.';
    }
  },
  meta: { description: 'The minimum and maximum values of the range slider.' },
});

export const rangeSliderControlState = dataControlState.extends({
  value: schema.maybe(rangeValue),
  step: schema.maybe(
    schema.number({
      meta: { description: 'The step size for the range slider.' },
    })
  ),
});

export const rangeSliderControl = baseControlSchema.extends({
  type: schema.literal(RANGE_SLIDER_CONTROL),
  controlConfig: rangeSliderControlState,
});
