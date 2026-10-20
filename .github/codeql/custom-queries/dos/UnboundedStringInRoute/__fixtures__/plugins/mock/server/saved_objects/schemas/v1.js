/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Test: Saved-object attribute schemas should be EXCLUDED (no alerts).
// These define data-at-rest shapes, not HTTP request payloads.
import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod';

export const rawRuleSchema = schema.object({
  name: schema.string(),
  description: schema.string(),
  status: schema.oneOf([schema.literal('ok'), schema.literal('error')]),
});

export const zodSoSchema = z.object({
  title: z.string(),
  state: z.string(),
});
