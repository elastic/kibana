/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export const durationFormatSchema = z
  .object({
    type: z.literal('duration'),
    params: z.object({
      input_format: z.union([
        z.literal('picoseconds'),
        z.literal('nanoseconds'),
        z.literal('microseconds'),
        z.literal('milliseconds'),
        z.literal('seconds'),
        z.literal('minutes'),
        z.literal('hours'),
        z.literal('days'),
        z.literal('weeks'),
        z.literal('months'),
        z.literal('years'),
      ]),
      output_format: z.union([
        z.literal('humanize'),
        z.literal('humanize_precise'),
        z.literal('as_milliseconds'),
        z.literal('as_seconds'),
        z.literal('as_minutes'),
        z.literal('as_hours'),
        z.literal('as_days'),
        z.literal('as_weeks'),
        z.literal('as_months'),
        z.literal('as_years'),
      ]),
      output_precision: z.number().default(2).optional().meta({
        title: 'Output precision',
        description: 'The number of decimal places to display in the duration value.',
      }),
      show_suffix: z.boolean().default(true).optional().meta({
        title: 'Show suffix',
        description:
          'Whether to display the suffix in the duration value. Suffix examples are "seconds", "milliseconds" or "years".',
      }),
      use_short_suffix: z.boolean().default(false).optional().meta({
        title: 'Use short suffix',
        description:
          'Whether to use the short suffix in the duration value. Short suffix examples are "s" for seconds, "ms" for milliseconds or "h" for hours.',
      }),
      include_space_with_suffix: z.boolean().default(true).optional().meta({
        title: 'Include space with suffix',
        description: 'Whether to include a space between the duration value and the suffix.',
      }),
    }),
  })
  .meta({
    id: 'kbn-field-format-duration',
    title: 'Duration field format',
    description: 'Formats a field into a duration value.',
  });
