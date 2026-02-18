/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export type MappingRuntimeFieldType =
  | 'boolean'
  | 'date'
  | 'double'
  | 'geo_point'
  | 'ip'
  | 'keyword'
  | 'long'
  | 'lookup';

export const runtimeMappings = z
  .record(
    z.object({
      type: z.union([
        z.literal('boolean'),
        z.literal('date'),
        z.literal('double'),
        z.literal('geo_point'),
        z.literal('ip'),
        z.literal('keyword'),
        z.literal('long'),
        z.literal('lookup'),
      ]),
      script: z
        .union([
          z.string(),
          z.object({ source: z.string() }),
          z.object({ id: z.string(), params: z.record(z.any()) }),
        ])
        .optional(),
      fetch_fields: z.array(z.string()).optional(),
      format: z.string().optional(),
      input_field: z.string().optional(),
      target_field: z.string().optional(),
      target_index: z.string().optional(),
    })
  )
  .optional();

export type RunTimeMappings = z.infer<typeof runtimeMappings>;
