/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const JsonModelShapeSchema = z.object({
  type: z.literal('object').optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  properties: z.record(z.string(), z.any()).optional(),
  required: z.array(z.string()).optional(),
  additionalProperties: z.union([z.boolean(), z.any()]).optional(),
  definitions: z.record(z.string(), z.any()).optional(),
  $defs: z.record(z.string(), z.any()).optional(),
});
