/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf, schema } from '@kbn/config-schema';
import { transactionDurationParamsSchema as transactionDurationParamsSchemaV1 } from './transaction_duration/v1';
import { anomalyParamsSchema as anomalyParamsSchemaV1 } from './apm_anomaly/v1';
import { errorCountParamsSchema as errorCountParamsSchemaV1 } from './error_count/v1';
import { transactionErrorRateParamsSchema as transactionErrorRateParamsSchemaV1 } from './transaction_error_rate/v1';

export const ruleParamsSchema = schema.oneOf([
  transactionDurationParamsSchemaV1,
  anomalyParamsSchemaV1,
  errorCountParamsSchemaV1,
  transactionErrorRateParamsSchemaV1,
  schema.recordOf(schema.string(), schema.maybe(schema.any()), {
    meta: { description: 'The parameters for the rule.' },
  }),
]);

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
