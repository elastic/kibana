/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';
import { optionsListControlSchema } from './options_list_schema';
import { rangeSliderControlSchema } from './range_slider_schema';

export const controlsGroupSchema = schema.object({
  controls: schema.arrayOf(
    schema.oneOf([
      optionsListControlSchema.extends({ type: schema.literal(OPTIONS_LIST_CONTROL) }),
      rangeSliderControlSchema.extends({ type: schema.literal(RANGE_SLIDER_CONTROL) }),
    ]), // order will be determined by array
    {
      defaultValue: [],
      meta: { description: 'An array of control panels and their state in the control group.' },
    }
  ),
});
