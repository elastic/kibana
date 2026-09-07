/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { numeralPatternSchema } from './common';

export const histogramFormatSchema = z
  .object({
    type: z.literal('histogram'),
    params: z.object({
      format: z.union([z.literal('bytes'), z.literal('percent'), z.literal('number')]),
      pattern: numeralPatternSchema,
    }),
  })
  .meta({
    id: 'kbn-field-format-histogram',
    title: 'Histogram field format',
    description:
      'Formats a histogram field into a numeric value following the defined pattern. The default pattern is defined by format:bytes:defaultPattern, format:percent:defaultPattern or format:number:defaultPattern advanced settings depending on the selected format.',
  });
