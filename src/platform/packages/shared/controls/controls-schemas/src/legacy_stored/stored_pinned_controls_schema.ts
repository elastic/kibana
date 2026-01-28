/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import {
  storedOptionsListDSLControlSchema,
  storedOptionsListESQLControlSchema,
} from './stored_options_list_schema';
import { storedRangeSliderControlSchema } from './stored_range_slider_schema';
import { storedTimeSliderControlSchema } from './stored_time_slider_schema';

export const storedPinnedControlSchema = schema.object({
  type: schema.string(),
  id: schema.string(),
  order: schema.number(), // order is generated from the array order of the API schema
  width: schema.maybe(schema.string()),
  grow: schema.maybe(schema.boolean()),
  explicitInput: schema.oneOf([
    storedOptionsListDSLControlSchema,
    storedRangeSliderControlSchema,
    storedTimeSliderControlSchema,
    storedOptionsListESQLControlSchema,
  ]),
});
