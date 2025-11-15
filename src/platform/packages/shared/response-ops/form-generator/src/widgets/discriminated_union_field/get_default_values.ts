/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const getDefaultValuesForOption = (
  optionSchema: z.ZodObject<z.ZodRawShape>,
  discriminatorKey?: string
) => {
  const defaultValues: Record<string, any> = {};

  const discriminator = discriminatorKey || 'type';
  if (discriminator in optionSchema.shape) {
    const discriminatorField = optionSchema.shape[discriminator] as z.ZodLiteral<string>;
    defaultValues[discriminator] = discriminatorField.value;
  }

  Object.entries(optionSchema.shape).forEach(([fieldKey, fieldSchema]) => {
    if (fieldKey === discriminator) return;

    const zodFieldSchema = fieldSchema as z.ZodTypeAny;

    try {
      // Try to parse undefined - this works if schema has .default() or .optional()
      defaultValues[fieldKey] = zodFieldSchema.parse(undefined);
    } catch {
      // Fallback to type-based defaults using instanceof checks
      if (zodFieldSchema instanceof z.ZodString) {
        defaultValues[fieldKey] = '';
      } else if (zodFieldSchema instanceof z.ZodNumber) {
        defaultValues[fieldKey] = 0;
      } else if (zodFieldSchema instanceof z.ZodBoolean) {
        defaultValues[fieldKey] = false;
      } else if (zodFieldSchema instanceof z.ZodArray) {
        defaultValues[fieldKey] = [];
      } else if (zodFieldSchema instanceof z.ZodObject) {
        defaultValues[fieldKey] = {};
      } else {
        defaultValues[fieldKey] = '';
      }
    }
  });

  return defaultValues;
};
