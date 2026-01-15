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
  CONTROL_WIDTH_LARGE,
  CONTROL_WIDTH_MEDIUM,
  CONTROL_WIDTH_SMALL,
  ESQL_CONTROL,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import {
  storedOptionsListDSLControlSchema,
  storedOptionsListESQLControlSchema,
} from './stored_options_list_schema';
import { storedRangeSliderControlSchema } from './stored_range_slider_schema';
import { storedTimeSliderControlSchema } from './stored_time_slider_schema';

export const storedPinnedControlSchema = schema.object({
  id: schema.string(), // id is required
  order: schema.number(), // order is generated from the array order of the API schema
  width: schema.maybe(schema.string())
  grow: schema.maybe(schema.boolean()),
});

export const controlsGroupSchema = schema.arrayOf(
  // order will be determined by the array
  schema.oneOf([
    schema
      .allOf([
        schema.object({
          type: schema.string(),
          explicitInput: storedOptionsListDSLControlSchema,
          dataViewRefName: schema.maybe(schema.string()),
        }),
        storedPinnedControlSchema,
      ])
      .extendsDeep({ unknowns: 'allow' }), // allows for legacy unknowns such as `parentField` and `enhancements`
    schema
      .allOf([
        schema.object({
          type: schema.string(),
          explicitInput: storedRangeSliderControlSchema,
          dataViewRefName: schema.maybe(schema.string()),
        }),
        storedPinnedControlSchema,
      ])
      .extendsDeep({ unknowns: 'allow' }),
    schema
      .allOf([
        schema.object({ type: schema.string()}), 
        schema.object({ explicitInput: storedTimeSliderControlSchema }),
        storedPinnedControlSchema,
      ])
      .extendsDeep({ unknowns: 'allow' }), // allows for legacy unknowns such as `useGlobalFilters`
    schema.allOf([
      schema.object({
        type: schema.string(),
        explicitInput: storedOptionsListESQLControlSchema,
      }),
      storedPinnedControlSchema,
    ]), // variable controls do not need `unknowns: 'allow'` because they have no legacy values
  ])
);
