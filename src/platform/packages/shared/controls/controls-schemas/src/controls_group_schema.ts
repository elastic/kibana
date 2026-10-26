/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import {
  CONTROL_WIDTH_LARGE,
  CONTROL_WIDTH_MEDIUM,
  CONTROL_WIDTH_SMALL,
  DEFAULT_PINNED_CONTROL_STATE,
  ESQL_CONTROL,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import { optionsListDSLControlSchema, optionsListESQLControlSchema } from './options_list_schema';
import { rangeSliderControlSchema } from './range_slider_schema';
import { timeSliderControlSchema } from './time_slider_schema';

export const controlWidthSchema = z
  .union([
    z.literal(CONTROL_WIDTH_SMALL),
    z.literal(CONTROL_WIDTH_MEDIUM),
    z.literal(CONTROL_WIDTH_LARGE),
  ])
  .default(DEFAULT_PINNED_CONTROL_STATE.width)
  .meta({
    description: 'Minimum width of the control panel.',
  });

export const pinnedControlSchema = z
  .object({
    id: z.string().optional().meta({ description: 'The unique ID of the control' }),
    width: controlWidthSchema,
    grow: z.boolean().default(DEFAULT_PINNED_CONTROL_STATE.grow).meta({
      description:
        'When `true`, the control expands to fill any available horizontal space. Defaults to `false`.',
    }),
  })
  .strict();

export const getControlsSchema = () => {
  /**
   * - keep types in alphabetical order for the sake of documentation
   * - control order will be determined by the array
   */
  return z.discriminatedUnion('type', [
    pinnedControlSchema
      .extend({
        type: z.literal(ESQL_CONTROL),
        config: optionsListESQLControlSchema,
      })
      .meta({
        id: 'kbn-controls-schemas-controls-group-schema-esql-control',
        title: ESQL_CONTROL,
        description:
          'An ES|QL variable control whose selected value is injected into ES|QL visualizations using the `?variable_name` syntax. Options can come from a fixed list or an ES|QL query. Define the options source in `config`.',
      }),
    pinnedControlSchema
      .extend({
        type: z.literal(OPTIONS_LIST_CONTROL),
        config: optionsListDSLControlSchema,
      })
      .meta({
        id: 'kbn-controls-schemas-controls-group-schema-options-list-control',
        title: OPTIONS_LIST_CONTROL,
        description:
          'A dropdown control that filters data by selecting field values from a data view. Define the data view, field, and selection settings in `config`.',
      }),
    pinnedControlSchema
      .extend({
        type: z.literal(RANGE_SLIDER_CONTROL),
        config: rangeSliderControlSchema,
      })
      .meta({
        id: 'kbn-controls-schemas-controls-group-schema-range-slider-control',
        title: RANGE_SLIDER_CONTROL,
        description:
          'A slider control that filters data by selecting a numeric range for the configured field. Define the data view, field, and selection settings in `config`.',
      }),
    pinnedControlSchema
      .extend({
        type: z.literal(TIME_SLIDER_CONTROL),
        config: timeSliderControlSchema,
      })
      .meta({
        id: 'kbn-controls-schemas-controls-group-schema-time-slider-control',
        title: TIME_SLIDER_CONTROL,
        description:
          'A control panel that filters a time field to a selected sub-range of the global time range. Define the start and end positions in `config` as fractions of the global range (0 to 1).',
      }),
  ]);
};

export const getControlsGroupSchema = () => {
  return z
    .array(getControlsSchema())
    .max(100)
    .default([])
    .meta({ description: 'An array of control panels and their state in the control group.' });
};
