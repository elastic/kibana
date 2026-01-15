/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { storedControlSchema, storedDataControlSchema } from './stored_control_schema';

const storedOptionsListControlBaseParameters = {
  displaySettings: schema.maybe(
    schema.object({
      placeholder: schema.maybe(schema.string()),
      hideActionBar: schema.maybe(schema.boolean()),
      hideExclude: schema.maybe(schema.boolean()),
      hideExists: schema.maybe(schema.boolean()),
      hideSort: schema.maybe(schema.boolean()),
    })
  ),
  searchTechnique: schema.maybe(schema.string()),
  sort: schema.maybe(
    schema.object({
      by: schema.string(),
      direction: schema.string(),
    })
  ),
  existsSelected: schema.maybe(schema.boolean()),
  runPastTimeout: schema.maybe(schema.boolean()),
  singleSelect: schema.maybe(schema.boolean()),
  exclude: schema.maybe(schema.boolean()),
};

export const storedOptionsListDSLControlSchema = storedDataControlSchema
  .extends(storedOptionsListControlBaseParameters)
  .extends({
    selectedOptions: schema.maybe(schema.arrayOf(schema.oneOf([schema.string(), schema.number()]))),
  });

export const storedOptionsListESQLControlSchema = storedControlSchema
  .extends(storedOptionsListControlBaseParameters)
  .extends({
    selectedOptions: schema.arrayOf(schema.string()),
    variableName: schema.string(),
    variableType: schema.string(),
    esqlQuery: schema.string(),
    controlType: schema.string(),
    availableOptions: schema.maybe(schema.arrayOf(schema.string())),
  });
