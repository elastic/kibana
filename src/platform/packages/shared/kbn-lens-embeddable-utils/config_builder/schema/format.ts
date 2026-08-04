/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';
import { LENS_FORMAT_NUMBER_DECIMALS_DEFAULT, LENS_FORMAT_COMPACT_DEFAULT } from './constants';
import { durationFormatSchema, legacyDurationFormatSchema } from './duration_units';

const numericFormatSchema = lazySchema(() =>
  z
    .object({
      type: z.enum(['number', 'percent']).meta({
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
    })
);

const byteFormatSchema = lazySchema(() =>
  z
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
    })
);

const customFormatSchema = lazySchema(() =>
  z
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
    })
);

/**
 * Format configuration for dimension values.
 * Accepts both GA and legacy unit names for the `duration` type so that neither is rejected at
 * the HTTP validation layer. The route handlers enforce exactly one set at runtime based on the
 * `asCode.useGASchemas` feature flag.
 */
export const formatTypeSchema = lazySchema(() =>
  z
    .union([
      numericFormatSchema,
      byteFormatSchema,
      durationFormatSchema,
      legacyDurationFormatSchema,
      customFormatSchema,
    ])
    .meta({
      id: 'formatType',
      title: 'Format Type',
      description: 'Number display format for the dimension value.',
    })
);

export const formatSchema = lazySchema(() =>
  z
    .object({
      /**
       * Format configuration
       */
      format: formatTypeSchema.optional(),
    })
    .strict()
);
