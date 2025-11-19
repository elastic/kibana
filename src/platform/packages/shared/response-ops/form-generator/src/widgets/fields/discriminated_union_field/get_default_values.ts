/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const getDefaultValuesFromSchema = (
  schema: z.ZodObject<z.ZodRawShape>,
  discriminatorKey?: string
) => {
  const defaultValues: Record<string, unknown> = {};

  Object.entries(schema.shape).forEach(([fieldKey, fieldSchema]) => {
    const zodFieldSchema = fieldSchema as z.ZodTypeAny;

    if (fieldKey === discriminatorKey && zodFieldSchema instanceof z.ZodLiteral) {
      defaultValues[fieldKey] = zodFieldSchema.value;
    } else {
      defaultValues[fieldKey] = '';
    }
  });

  return defaultValues;
};
