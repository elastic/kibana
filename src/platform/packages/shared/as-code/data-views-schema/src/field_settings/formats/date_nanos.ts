/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { momentPatternSchema } from './common';

export const dateNanosFormatSchema = z.object({
  type: z.literal('date_nanos'),
  params: z
    .object({
      pattern: momentPatternSchema.default('MMM D, YYYY @ HH:mm:ss.SSSSSSSSS'),
    })
    .optional(),
});
