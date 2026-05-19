/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { LENS_FORMAT_NUMBER_DECIMALS_DEFAULT, LENS_FORMAT_COMPACT_DEFAULT } from './constants';

const numericFormatSchema = z
  .object({
    type: z.union([z.literal('number'), z.literal('percent')]).meta({
      description: 'Value format type: `number` for plain numbers, `percent` for percentages.',
    }),
    /**
     * Number of decimals
     */
    decimals: z.number().default(LENS_FORMAT_NUMBER_DECIMALS_DEFAULT).meta({
      description: 'Number of decimal places to display.',
    }),
    /**
     * Suffix
     */
    suffix: z.string().optional().meta({
      description: 'Suffix appended to the formatted value.',
    }),
    /**
     * Whether to use compact notation
     */
    compact: z.boolean().default(LENS_FORMAT_COMPACT_DEFAULT).meta({
      description:
        'When `true`, uses compact notation (for example, 1.2k instead of 1,200). Defaults to `false`.',
    }),
  })
  .strict()
  .meta({
    id: 'numericFormat',
    title: 'Numeric Format',
    description:
      'Number or percentage format with optional decimal places, suffix, and compact notation.',
  });

const byteFormatSchema = z
  .object({
    type: z
      .union([z.literal('bits'), z.literal('bytes')])
      .meta({ description: 'Data size unit: `bits` or `bytes`.' }),
    /**
     * Number of decimals
     */
    decimals: z.number().default(LENS_FORMAT_NUMBER_DECIMALS_DEFAULT).meta({
      description: 'Number of decimal places to display.',
    }),
    /**
     * Suffix
     */
    suffix: z.string().optional().meta({
      description: 'Suffix appended to the formatted value.',
    }),
  })
  .strict()
  .meta({
    id: 'byteFormat',
    title: 'Byte Format',
    description: 'Data size format in bits or bytes, with optional decimal places and suffix.',
  });

const durationFormatSchema = z
  .object({
    type: z.literal('duration'),
    /**
     * From
     */
    from: z.string().meta({
      description:
        'Source time unit for conversion, for example `milliseconds`, `seconds`, `minutes`, `hours`, or `days`.',
    }),
    /**
     * To
     */
    to: z.string().meta({
      description:
        'Display time unit after conversion, for example `seconds`, `minutes`, `hours`, or `days`.',
    }),
    /**
     * Suffix
     */
    suffix: z.string().optional().meta({
      description: 'Suffix appended to the formatted value.',
    }),
  })
  .strict()
  .meta({
    id: 'durationFormat',
    title: 'Duration Format',
    description: 'Duration format between time units.',
  });

const customFormatSchema = z
  .object({
    type: z.literal('custom'),
    /**
     * Pattern
     */
    pattern: z.string().meta({
      description: 'Kibana field format pattern string.',
    }),
  })
  .strict()
  .meta({
    id: 'customFormat',
    title: 'Custom Format',
    description: 'Custom format using a Kibana field format pattern string.',
  });

/**
 * Format configuration
 */
export const formatTypeSchema = z
  .union([numericFormatSchema, byteFormatSchema, durationFormatSchema, customFormatSchema])
  .meta({
    id: 'formatType',
    title: 'Format Type',
    description: 'Number display format for the dimension value.',
  });

export const formatSchema = z
  .object({
    /**
     * Format configuration
     */
    format: formatTypeSchema.optional(),
  })
  .strict();
