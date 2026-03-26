/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_TIME_SLIDER_STATE } from '@kbn/controls-constants';

export const timeSliderControlSchema = schema.object({
  start_percentage_of_time_range: schema.number({
    defaultValue: DEFAULT_TIME_SLIDER_STATE.start_percentage_of_time_range,
    min: 0,
    max: 1,
  }),
  end_percentage_of_time_range: schema.number({
    defaultValue: DEFAULT_TIME_SLIDER_STATE.end_percentage_of_time_range,
    min: 0,
    max: 1,
  }),
  is_anchored: schema.boolean({ defaultValue: DEFAULT_TIME_SLIDER_STATE.is_anchored }),
});
