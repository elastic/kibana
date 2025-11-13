/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Helper to retrieve metadata from Zod schemas
 *
 * Uses Zod v4's native .meta() method to store and retrieve metadata
 */

import { z } from '@kbn/zod/v4';

/**
 * Helper function to retrieve metadata from a Zod schema
 *
 * Retrieves metadata that was attached using Zod's native .meta() method
 */
export function getMeta(schema: z.ZodTypeAny): any {
  return z.globalRegistry.get(schema);
}
