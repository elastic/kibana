/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

const DURATION_FINE_GRAINED_INPUT = ['ps', 'ns', 'us'] as const;

const DURATION_STANDARD_INPUT = ['ms', 's', 'min', 'h', 'd', 'w', 'mo', 'y'] as const;
const DURATION_INPUT_UNITS = [...DURATION_FINE_GRAINED_INPUT, ...DURATION_STANDARD_INPUT] as const;
const DURATION_AUTO_OUTPUT = ['auto', 'auto-approximate'] as const;
const DURATION_OUTPUT_UNITS = [...DURATION_AUTO_OUTPUT, ...DURATION_STANDARD_INPUT] as const;

export type DurationInputUnit = (typeof DURATION_INPUT_UNITS)[number];
export type DurationOutputUnit = (typeof DURATION_OUTPUT_UNITS)[number];

export const durationInputUnitSchema = z.enum(DURATION_INPUT_UNITS);

export const durationOutputUnitSchema = z.enum(DURATION_OUTPUT_UNITS);

const durationFormatSuffixSchema = z.string().optional().meta({
  description: 'Suffix appended to the formatted value.',
});

export const durationFormatSchema = z
  .object({
    type: z.literal('duration'),
    from: durationInputUnitSchema.meta({
      description:
        'Source time unit of the raw field value, including fine-grained units (`ps`, `ns`, `us`) in addition to standard units. This describes how the stored data is encoded, not a query duration literal.',
    }),
    to: durationOutputUnitSchema.meta({
      description:
        'Display time unit: `auto` (precise), `auto-approximate`, or a fixed conversion unit.',
    }),
    suffix: durationFormatSuffixSchema,
  })
  .strict()
  .meta({
    id: 'durationFormat',
    title: 'Duration Format',
    description: 'Duration format between time units.',
  });

/**
 * Legacy duration format schema accepting pre-GA free-form string values for `to` and `from`.
 * Used as a fallback when `asCode.useGASchemas` is disabled.
 * @see AS_CODE_USE_GA_SCHEMAS_FEATURE_FLAG
 */
export const legacyDurationFormatSchema = z
  .object({
    type: z.literal('duration'),
    /**
     * Unit of the original field value
     * (i.e. 'picoseconds', 'nanoseconds', 'microseconds', 'milliseconds', 'seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years')
     */
    from: z.string().meta({
      description:
        'Source time unit for conversion, for example `milliseconds`, `seconds`, `minutes`, `hours`, or `days`.',
    }),
    /**
     * Unit of the formatted value
     * (i.e. 'humanize', 'humanizePrecise', 'asMilliseconds', 'asSeconds', 'asMinutes', 'asHours', 'asDays', 'asWeeks', 'asMonths', 'asYears')
     */
    to: z.string().meta({
      description:
        'Display time unit after conversion, for example `seconds`, `minutes`, `hours`, or `days`.',
    }),
    suffix: durationFormatSuffixSchema,
  })
  .strict()
  .meta({
    id: 'legacyDurationFormat',
    title: 'Duration Format (Legacy)',
    description:
      'Legacy duration format used when the `asCode.useGASchemas` feature flag is disabled. Accepts free-form unit strings (no enum validation) to preserve pre-GA behavior.',
  });
