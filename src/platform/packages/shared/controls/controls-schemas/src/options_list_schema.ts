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
  DEFAULT_DSL_OPTIONS_LIST_STATE,
  DEFAULT_ESQL_OPTIONS_LIST_STATE,
  MAX_OPTIONS_LIST_REQUEST_SIZE,
} from '@kbn/controls-constants';
import { controlSchema, dataControlSchema } from './control_schema';

const SELECTIONS_MAX = 10000;

export const optionsListDisplaySettingsSchema = schema.object({
  placeholder: schema.maybe(schema.string()),
  hide_action_bar: schema.maybe(schema.boolean()),
  hide_exclude: schema.maybe(schema.boolean()),
  hide_exists: schema.maybe(schema.boolean()),
  hide_sort: schema.maybe(schema.boolean()),
});

export const optionsListSearchTechniqueSchema = schema.oneOf(
  [schema.literal('prefix'), schema.literal('wildcard'), schema.literal('exact')],
  { defaultValue: DEFAULT_DSL_OPTIONS_LIST_STATE.search_technique }
);

export const optionsListSortSchema = schema.object(
  {
    by: schema.oneOf([schema.literal('_count'), schema.literal('_key')]),
    direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
  },
  { defaultValue: DEFAULT_DSL_OPTIONS_LIST_STATE.sort }
);

export const optionsListSelectionSchema = schema.oneOf([schema.string(), schema.number()]);

const optionsListControlBaseParameters = {
  display_settings: schema.maybe(optionsListDisplaySettingsSchema),
};

export const optionsListDSLControlSchema = dataControlSchema
  .extends(optionsListControlBaseParameters)
  .extends({
    exclude: schema.boolean({ defaultValue: DEFAULT_DSL_OPTIONS_LIST_STATE.exclude }),
    exists_selected: schema.boolean({
      defaultValue: DEFAULT_DSL_OPTIONS_LIST_STATE.exists_selected,
    }),
    run_past_timeout: schema.boolean({
      defaultValue: DEFAULT_DSL_OPTIONS_LIST_STATE.run_past_timeout,
    }),
    search_technique: optionsListSearchTechniqueSchema,
    selected_options: schema.arrayOf(optionsListSelectionSchema, {
      defaultValue: DEFAULT_DSL_OPTIONS_LIST_STATE.selected_options,
      maxSize: SELECTIONS_MAX,
    }),
    single_select: schema.boolean({ defaultValue: DEFAULT_DSL_OPTIONS_LIST_STATE.single_select }),
    sort: optionsListSortSchema,
  });

export const optionsListESQLControlSchema = controlSchema
  .extends(optionsListControlBaseParameters)
  .extends({
    selected_options: schema.arrayOf(schema.string(), { maxSize: SELECTIONS_MAX }),
    single_select: schema.boolean({ defaultValue: DEFAULT_ESQL_OPTIONS_LIST_STATE.single_select }),
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
    available_options: schema.maybe(
      schema.arrayOf(schema.string(), { maxSize: MAX_OPTIONS_LIST_REQUEST_SIZE })
    ),
  });
