/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const esqlControlSchema = schema.object({
  variableName: schema.string(),
  variableType: schema.oneOf([
    schema.literal('time_literal'),
    schema.literal('fields'),
    schema.literal('values'),
    schema.literal('multi_values'),
    schema.literal('functions'),
  ]),
  esqlQuery: schema.string(),
  controlType: schema.oneOf([schema.literal('STATIC_VALUES'), schema.literal('VALUES_FROM_QUERY')]),
  selectedOptions: schema.arrayOf(schema.string()),
  availableOptions: schema.maybe(schema.arrayOf(schema.string())),
});
