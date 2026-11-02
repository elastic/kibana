/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Test: Content-management layer schemas should be EXCLUDED (no alerts).
// These define CM CRUD shapes for maps, lens, links, etc.
import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod';

export const cmAttributesSchema = schema.object({
  title: schema.string(),
  description: schema.string(),
});

export const zodCmSchema = z.object({
  name: z.string(),
  type: z.string(),
});
