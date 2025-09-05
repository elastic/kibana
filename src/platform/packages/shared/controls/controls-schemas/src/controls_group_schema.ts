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
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import { optionsListControlSchema } from './options_list_schema';
import { rangeSliderControlSchema } from './range_slider_schema';

export const controlWidthSchema = schema.oneOf(
  [
    schema.literal(CONTROL_WIDTH_SMALL),
    schema.literal(CONTROL_WIDTH_MEDIUM),
    schema.literal(CONTROL_WIDTH_LARGE),
  ],
  {
    defaultValue: DEFAULT_CONTROL_WIDTH,
    meta: { description: 'Minimum width of the control panel in the control group.' },
  }
);

const stickyControlSchema = schema.object({
  width: schema.maybe(controlWidthSchema),
  grow: schema.maybe(
    schema.boolean({
      defaultValue: DEFAULT_CONTROL_GROW,
      meta: { description: 'Expand width of the control panel to fit available space.' },
    })
  ),
  enhancements: schema.maybe(schema.recordOf(schema.string(), schema.any())),
});

export const controlsGroupSchema = schema.object({
  controls: schema.arrayOf(
    // order will be determined by the array
    schema.oneOf([
      schema.allOf([
        schema.object({ type: schema.literal(OPTIONS_LIST_CONTROL) }),
        optionsListControlSchema,
        stickyControlSchema,
      ]),
      schema.allOf([
        schema.object({ type: schema.literal(RANGE_SLIDER_CONTROL) }),
        rangeSliderControlSchema,
        stickyControlSchema,
      ]),
    ]),
    {
      defaultValue: [],
      meta: { description: 'An array of control panels and their state in the control group.' },
    }
  ),
});
