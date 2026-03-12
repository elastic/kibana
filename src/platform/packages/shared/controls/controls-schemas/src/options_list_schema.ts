/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { DEFAULT_SEARCH_TECHNIQUE, OPTIONS_LIST_DEFAULT_SORT } from '@kbn/controls-constants';
import { controlSchema, dataControlSchema } from './control_schema';

export const optionsListDisplaySettingsSchema = schema.object({
  placeholder: schema.maybe(schema.string()),
  hide_action_bar: schema.maybe(schema.boolean()),
  hide_exclude: schema.maybe(schema.boolean()),
  hide_exists: schema.maybe(schema.boolean()),
  hide_sort: schema.maybe(schema.boolean()),
});

export const optionsListSearchTechniqueSchema = schema.oneOf(
  [schema.literal('prefix'), schema.literal('wildcard'), schema.literal('exact')],
  { defaultValue: DEFAULT_SEARCH_TECHNIQUE }
);

export const optionsListSortSchema = schema.object(
  {
    by: schema.oneOf([schema.literal('_count'), schema.literal('_key')]),
    direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
  },
  { defaultValue: OPTIONS_LIST_DEFAULT_SORT }
);

export const optionsListSelectionSchema = schema.oneOf([schema.string(), schema.number()]);

const optionsListControlBaseParameters = {
  display_settings: schema.maybe(optionsListDisplaySettingsSchema),
  single_select: schema.maybe(schema.boolean({ defaultValue: false })),
};

export const optionsListDSLControlSchema = dataControlSchema
  .extends(optionsListControlBaseParameters)
  .extends({
    exclude: schema.maybe(schema.boolean({ defaultValue: false })),
    exists_selected: schema.maybe(schema.boolean({ defaultValue: false })),
    run_past_timeout: schema.maybe(schema.boolean({ defaultValue: false })),
    search_technique: schema.maybe(optionsListSearchTechniqueSchema),
    selected_options: schema.maybe(
      schema.arrayOf(optionsListSelectionSchema, { defaultValue: [] })
    ),
    sort: schema.maybe(optionsListSortSchema),
  });

export const optionsListESQLControlSchema = controlSchema
  .extends(optionsListControlBaseParameters)
  .extends({
    selected_options: schema.arrayOf(schema.string()),
    variable_name: schema.string(),
    variable_type: schema.oneOf([
      schema.literal('fields'),
      schema.literal('values'),
      schema.literal('functions'),
      schema.literal('time_literal'),
      schema.literal('multi_values'),
    ]),
    esql_query: schema.string(),
    control_type: schema.oneOf([
      schema.literal('STATIC_VALUES'),
      schema.literal('VALUES_FROM_QUERY'),
    ]),
    available_options: schema.maybe(schema.arrayOf(schema.string())),
  });
