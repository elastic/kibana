/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { DEFAULT_TIME_SLIDER_STATE } from '@kbn/controls-constants';

export const timeSliderControlSchema = z.object({
  start_percentage_of_time_range: z
    .number()
    .min(0)
    .max(1)
    .default(DEFAULT_TIME_SLIDER_STATE.start_percentage_of_time_range)
    .meta({
      description:
        'The start of the selected time window expressed as a fraction of the global time range, where `0` is the beginning and `1` is the end of the range.',
    }),
  end_percentage_of_time_range: z
    .number()
    .min(0)
    .max(1)
    .default(DEFAULT_TIME_SLIDER_STATE.end_percentage_of_time_range)
    .meta({
      description:
        'The end of the selected time window expressed as a fraction of the global time range, where `0` is the beginning and `1` is the end of the range.',
    }),
  is_anchored: z.boolean().default(DEFAULT_TIME_SLIDER_STATE.is_anchored).meta({
    description:
      'When `true`, the start of the time window is fixed at the beginning of the global time range. Only the end of the window can be adjusted. Defaults to `false`.',
  }),
});
