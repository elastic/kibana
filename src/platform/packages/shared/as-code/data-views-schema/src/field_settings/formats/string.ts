/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const stringFormatSchema = z.object({
  type: z.literal('string'),
  params: z
    .object({
      transform: z
        .union([
          z.literal('lower'),
          z.literal('upper'),
          z.literal('title'),
          z.literal('short'),
          z.literal('base64'),
          z.literal('urlparam'),
        ])
        .optional(),
    })
    .optional(),
});
