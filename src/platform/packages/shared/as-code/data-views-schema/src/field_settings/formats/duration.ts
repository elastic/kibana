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
      input_format: z
        .union([
          z.literal('picoseconds').meta({ title: 'Picoseconds' }),
          z.literal('nanoseconds').meta({ title: 'Nanoseconds' }),
          z.literal('microseconds').meta({ title: 'Microseconds' }),
          z.literal('milliseconds').meta({ title: 'Milliseconds' }),
          z.literal('seconds').meta({ title: 'Seconds' }),
          z.literal('minutes').meta({ title: 'Minutes' }),
          z.literal('hours').meta({ title: 'Hours' }),
          z.literal('days').meta({ title: 'Days' }),
          z.literal('weeks').meta({ title: 'Weeks' }),
          z.literal('months').meta({ title: 'Months' }),
          z.literal('years').meta({ title: 'Years' }),
        ])
        .meta({
          title: 'Input format',
          description: 'The unit of the field value before formatting.',
        }),
      output_format: z
        .union([
          z.literal('humanize').meta({
            title: 'Human-readable (approximate)',
            description:
              'Displays the duration in the largest whole unit that applies, rounded. For example: "2 hours" or "a day".',
          }),
          z.literal('humanize_precise').meta({
            title: 'Human-readable (precise)',
            description:
              'Displays the duration in the largest whole unit that applies, with decimal precision. For example: "2.35 hours".',
          }),
          z.literal('as_milliseconds').meta({ title: 'Milliseconds' }),
          z.literal('as_seconds').meta({ title: 'Seconds' }),
          z.literal('as_minutes').meta({ title: 'Minutes' }),
          z.literal('as_hours').meta({ title: 'Hours' }),
          z.literal('as_days').meta({ title: 'Days' }),
          z.literal('as_weeks').meta({ title: 'Weeks' }),
          z.literal('as_months').meta({ title: 'Months' }),
          z.literal('as_years').meta({ title: 'Years' }),
        ])
        .meta({
          title: 'Output format',
          description: 'The unit to convert the field value into for display.',
        }),
      output_precision: z.number().default(2).optional().meta({
        title: 'Output precision',
        description: 'The number of decimal places to display in the duration value.',
      }),
      show_suffix: z.boolean().optional().meta({
        title: 'Show suffix',
        description:
          'When true, the formatted duration includes a suffix (such as "seconds", "milliseconds", or "years"). When false or not provided, no suffix is shown.',
      }),
      use_short_suffix: z.boolean().default(false).optional().meta({
        title: 'Use short suffix',
        description:
          'When true, the formatted duration uses short suffixes (such as "s", "ms", or "h"). When false or not provided, full suffixes are used.',
      }),
      include_space_with_suffix: z.boolean().default(true).optional().meta({
        title: 'Include space with suffix',
        description:
          'When true or not provided, the formatted duration includes a space between the value and suffix. When false, no space is included.',
      }),
    }),
  })
  .meta({
    id: 'kbn-field-format-duration',
    title: 'Duration field format',
    description: 'Formats a field into a duration value.',
  });
