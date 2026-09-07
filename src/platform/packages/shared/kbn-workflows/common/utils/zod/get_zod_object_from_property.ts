/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getShape } from './get_shape';
import { getZodObjectProperty } from './get_zod_object_property';

export function getZodObjectFromProperty(
  schema: z.ZodObject | z.ZodOptional | z.ZodNever,
  property: string
): z.ZodObject | null {
  const atProperty = getZodObjectProperty(schema, property);
  if (atProperty === null) {
    return null;
  }
  return z.object({ ...getShape(atProperty as z.ZodObject) });
}
