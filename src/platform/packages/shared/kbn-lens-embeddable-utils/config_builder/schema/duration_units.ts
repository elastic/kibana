/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

const DURATION_FINE_GRAINED_INPUT = ['ps', 'ns', 'us'] as const;
const DURATION_STANDARD_INPUT = ['ms', 's', 'min', 'h', 'd', 'w', 'mo', 'y'] as const;
const DURATION_INPUT_UNITS_DSL = [
  ...DURATION_FINE_GRAINED_INPUT,
  ...DURATION_STANDARD_INPUT,
] as const;
const DURATION_INPUT_UNITS_ESQL = DURATION_STANDARD_INPUT;
const DURATION_AUTO_OUTPUT = ['auto', 'auto-approximate'] as const;
const DURATION_OUTPUT_UNITS = [...DURATION_AUTO_OUTPUT, ...DURATION_STANDARD_INPUT] as const;

export type DurationInputUnitDsl = (typeof DURATION_INPUT_UNITS_DSL)[number];
export type DurationInputUnitEsql = (typeof DURATION_INPUT_UNITS_ESQL)[number];
export type DurationOutputUnit = (typeof DURATION_OUTPUT_UNITS)[number];

interface Options<T extends string> {
  defaultValue?: T;
  meta?: { description: string };
}

export const durationInputUnitDslSchema = (opts?: Options<DurationInputUnitDsl>) =>
  schema.oneOf(
    [
      schema.literal('ps'),
      schema.literal('ns'),
      schema.literal('us'),
      schema.literal('ms'),
      schema.literal('s'),
      schema.literal('min'),
      schema.literal('h'),
      schema.literal('d'),
      schema.literal('w'),
      schema.literal('mo'),
      schema.literal('y'),
    ],
    opts
  );

export const durationInputUnitEsqlSchema = (opts?: Options<DurationInputUnitEsql>) =>
  schema.oneOf(
    [
      schema.literal('ms'),
      schema.literal('s'),
      schema.literal('min'),
      schema.literal('h'),
      schema.literal('d'),
      schema.literal('w'),
      schema.literal('mo'),
      schema.literal('y'),
    ],
    opts
  );

export const durationOutputUnitSchema = (opts?: Options<DurationOutputUnit>) =>
  schema.oneOf(
    [
      schema.literal('auto'),
      schema.literal('auto-approximate'),
      schema.literal('ms'),
      schema.literal('s'),
      schema.literal('min'),
      schema.literal('h'),
      schema.literal('d'),
      schema.literal('w'),
      schema.literal('mo'),
      schema.literal('y'),
    ],
    opts
  );

const durationFormatSuffixSchema = schema.maybe(
  schema.string({
    meta: {
      description: 'Suffix appended to the formatted value.',
    },
  })
);

const durationFormatMeta = {
  title: 'Duration Format',
  description: 'Duration format between time units.',
};

export const dslDurationFormatSchema = schema.object(
  {
    type: schema.literal('duration'),
    from: durationInputUnitDslSchema({
      meta: {
        description:
          'Source time unit. DSL supports fine-grained units (`ps`, `ns`, `us`) in addition to standard units.',
      },
    }),
    to: durationOutputUnitSchema({
      meta: {
        description:
          'Display time unit: `auto` (precise), `auto-approximate`, or a fixed conversion unit.',
      },
    }),
    suffix: durationFormatSuffixSchema,
  },
  {
    meta: {
      id: 'dslDurationFormat',
      ...durationFormatMeta,
    },
  }
);

export const esqlDurationFormatSchema = schema.object(
  {
    type: schema.literal('duration'),
    from: durationInputUnitEsqlSchema({
      meta: {
        description:
          'Source time unit for ES|QL data sources (`ms`, `s`, `min`, `h`, `d`, `w`, `mo`, `y`).',
      },
    }),
    to: durationOutputUnitSchema({
      meta: {
        description:
          'Display time unit: `auto` (precise), `auto-approximate`, or a fixed conversion unit.',
      },
    }),
    suffix: durationFormatSuffixSchema,
  },
  {
    meta: {
      id: 'esqlDurationFormat',
      ...durationFormatMeta,
    },
  }
);

/**
 * Legacy duration format schema accepting pre-GA free-form string values for `from` and `to`.
 * Used as a fallback when `asCode.useGASchemas` is disabled (default during Tech Preview).
 * @see AS_CODE_USE_GA_SCHEMAS_FEATURE_FLAG
 */
export const legacyDurationFormatSchema = schema.object(
  {
    type: schema.literal('duration'),
    from: schema.string({
      meta: {
        description:
          'Source time unit (legacy free-form string; use short ES|QL-aligned enums when `asCode.useGASchemas` is enabled).',
      },
    }),
    to: schema.string({
      meta: {
        description:
          'Display time unit (legacy free-form string; use short ES|QL-aligned enums when `asCode.useGASchemas` is enabled).',
      },
    }),
    suffix: durationFormatSuffixSchema,
  },
  {
    meta: {
      id: 'legacyDurationFormat',
      title: 'Duration Format (Legacy)',
      description: 'Legacy duration format accepting pre-GA free-form string values.',
    },
  }
);
