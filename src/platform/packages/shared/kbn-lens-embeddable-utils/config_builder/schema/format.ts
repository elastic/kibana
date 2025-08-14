/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

// @TODO: move it to shared type/values package
const LENS_FORMAT_NUMBER_DECIMALS_DEFAULT = 2;

const numericFormatSchema = schema.object({
  type: schema.oneOf([schema.literal('number'), schema.literal('percent')]),
  /**
   * Number of decimals
   */
  decimals: schema.number({
    defaultValue: LENS_FORMAT_NUMBER_DECIMALS_DEFAULT,
    meta: {
      description: 'Number of decimals',
    },
  }),
  /**
   * Suffix
   */
  suffix: schema.maybe(
    schema.string({
      defaultValue: '',
      meta: {
        description: 'Suffix',
      },
    })
  ),
  /**
   * Whether to use compact notation
   */
  compact: schema.maybe(
    schema.boolean({
      defaultValue: false,
      meta: {
        description: 'Whether to use compact notation',
      },
    })
  ),
});

const byteFormatSchema = schema.object({
  type: schema.oneOf([schema.literal('bits'), schema.literal('bytes')]),
  /**
   * Number of decimals
   */
  decimals: schema.maybe(
    schema.number({
      meta: {
        description: 'Number of decimals',
      },
    })
  ),
  /**
   * Suffix
   */
  suffix: schema.maybe(
    schema.string({
      meta: {
        description: 'Suffix',
      },
    })
  ),
});

const durationFormatSchema = schema.object({
  type: schema.literal('duration'),
  /**
   * From
   */
  from: schema.string({
    meta: {
      description: 'From',
    },
  }),
  /**
   * To
   */
  to: schema.string({
    meta: {
      description: 'To',
    },
  }),
  /**
   * Suffix
   */
  suffix: schema.maybe(
    schema.string({
      meta: {
        description: 'Suffix',
      },
    })
  ),
});

const customFormatSchema = schema.object({
  type: schema.literal('custom'),
  /**
   * Pattern
   */
  pattern: schema.string({
    meta: {
      description: 'Pattern',
    },
  }),
});

/**
 * Format configuration
 */
export const formatTypeSchema = schema.oneOf([
  numericFormatSchema,
  byteFormatSchema,
  durationFormatSchema,
  customFormatSchema,
]);

export const formatSchema = schema.object({
  /**
   * Format configuration
   */
  format: schema.maybe(formatTypeSchema),
});
