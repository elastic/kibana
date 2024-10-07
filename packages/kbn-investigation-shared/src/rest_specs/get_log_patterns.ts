/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { logPatternSchema } from './log_pattern';

const getLogPatternsParamsSchema = z.object({
  body: z.object({
    sources: z.array(
      z.object({
        index: z.string(),
        serviceName: z.string().optional(),
        environment: z.string().optional(),
        containerId: z.string().optional(),
        hostName: z.string().optional(),
      })
    ),
    start: z.string(),
    end: z.string(),
  }),
});

const getLogPatternsResponseSchema = z.object({
  logPatterns: z.array(
    z.object({
      index: z.string(),
      impactingPatterns: z.array(logPatternSchema),
    })
  ),
});

type GetLogPatternsParams = z.infer<typeof getLogPatternsParamsSchema.shape.body>;
type GetLogPatternsResponse = z.output<typeof getLogPatternsResponseSchema>;

export { getLogPatternsParamsSchema, getLogPatternsResponseSchema };
export type { GetLogPatternsParams, GetLogPatternsResponse };
