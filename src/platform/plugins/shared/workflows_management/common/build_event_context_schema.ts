/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventTimestampSchema } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

const isZodObject = (schema: z.ZodType): schema is z.ZodObject<z.ZodRawShape> =>
  schema instanceof z.ZodObject;

export const extendEventContextSchema = (
  baseSchema: z.ZodType,
  eventSchema: z.ZodType,
  { includeTimestamp = false }: { includeTimestamp?: boolean } = {}
): z.ZodType => {
  if (!isZodObject(baseSchema) || !isZodObject(eventSchema)) {
    return baseSchema;
  }

  return z.object({
    ...baseSchema.shape,
    ...eventSchema.shape,
    ...(includeTimestamp ? (EventTimestampSchema as z.ZodObject<z.ZodRawShape>).shape : undefined),
  });
};
