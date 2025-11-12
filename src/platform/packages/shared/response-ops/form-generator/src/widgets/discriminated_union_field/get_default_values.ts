/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getDiscriminatorFieldValue } from './discriminated_union_field';

export const getDefaultValuesForOption = (optionSchema: z.ZodObject<z.ZodRawShape>) => {
  const defaultValues: Record<string, unknown> = {};
  const discriminatorValue = getDiscriminatorFieldValue(optionSchema);

  defaultValues.type = discriminatorValue;

  Object.entries(optionSchema.shape).forEach(([fieldKey, fieldSchema]) => {
    if (fieldKey === 'type') return; // Skip discriminator

    const zodFieldSchema = fieldSchema as z.ZodTypeAny;

    try {
      const parsed = zodFieldSchema.parse(undefined);
      defaultValues[fieldKey] = parsed;
    } catch {
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
