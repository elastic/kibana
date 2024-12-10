/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf, schema } from '@kbn/config-schema';

export const ruleParamsSchema = schema.recordOf(schema.string(), schema.maybe(schema.any()), {
  meta: { description: 'The parameters for the rule.' },
});

export const ruleParamsSchemaWithDefaultValue = schema.recordOf(
  schema.string(),
  schema.maybe(schema.any()),
  {
    defaultValue: {},
    meta: { description: 'The parameters for the rule.' },
  }
);

export type RuleParams = TypeOf<typeof ruleParamsSchema>;
export type RuleParamsWithDefaultValue = TypeOf<typeof ruleParamsSchemaWithDefaultValue>;
