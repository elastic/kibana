/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

const getSchema = (options?: Record<string, unknown>) =>
  schema.recordOf(schema.string(), schema.maybe(schema.any()), {
    ...options,
    meta: { description: 'The parameters for the rule.' },
  });

export const getRuleParamsSchema = () => getSchema();
export const getRuleParamsSchemaWithDefaultValue = () => getSchema({ defaultValue: {} });
