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
  hideActionBar: schema.maybe(schema.boolean()),
  hideExclude: schema.maybe(schema.boolean()),
  hideExists: schema.maybe(schema.boolean()),
  hideSort: schema.maybe(schema.boolean()),
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
  displaySettings: schema.maybe(optionsListDisplaySettingsSchema),
  searchTechnique: schema.maybe(optionsListSearchTechniqueSchema),
  sort: schema.maybe(optionsListSortSchema),
  existsSelected: schema.maybe(schema.boolean({ defaultValue: false })),
  runPastTimeout: schema.maybe(schema.boolean({ defaultValue: false })),
  singleSelect: schema.maybe(schema.boolean({ defaultValue: false })),
  exclude: schema.maybe(schema.boolean({ defaultValue: false })),
};

export const optionsListDSLControlSchema = dataControlSchema
  .extends(optionsListControlBaseParameters)
  .extends({
    selectedOptions: schema.maybe(schema.arrayOf(optionsListSelectionSchema, { defaultValue: [] })),
  });

export const optionsListESQLControlSchema = controlSchema
  .extends(optionsListControlBaseParameters)
  .extends({
    selectedOptions: schema.arrayOf(schema.string()),
    variableName: schema.string(),
    variableType: schema.oneOf([
      schema.literal('fields'),
      schema.literal('values'),
      schema.literal('functions'),
      schema.literal('time_literal'),
      schema.literal('multi_values'),
    ]),
    esqlQuery: schema.string(),
    controlType: schema.oneOf([
      schema.literal('STATIC_VALUES'),
      schema.literal('VALUES_FROM_QUERY'),
    ]),
    availableOptions: schema.maybe(schema.arrayOf(schema.string())),
  });
