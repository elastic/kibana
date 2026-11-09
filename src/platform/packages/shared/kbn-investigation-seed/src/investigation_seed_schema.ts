/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { z, lazySchema } from '@kbn/zod/v4';

export const MAX_INVESTIGATION_FILTERS = 50;
export const MAX_INVESTIGATION_HOSTS = 10;
export const MAX_INVESTIGATION_TEXT_CHARS = 10_000;
export const MAX_INVESTIGATION_FIELD_CHARS = 1_024;

const MAX_LANGUAGE_CHARS = 32;

export const INVESTIGATION_ENTITY_FIELDS = [
  'service.name',
  'service.environment',
  'host.name',
  'container.id',
  'trace.id',
  'user.name',
  'source.ip',
] as const;

export type InvestigationEntityField = (typeof INVESTIGATION_ENTITY_FIELDS)[number];

const boundedIdSchema = lazySchema(() => z.string().min(1).max(MAX_INVESTIGATION_FIELD_CHARS));

const isBoundedJson = (value: unknown, maxChars: number): boolean => {
  try {
    return JSON.stringify(value).length <= maxChars;
  } catch {
    return false;
  }
};

const isFilter = (value: unknown): value is Filter => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const filter = value as Filter;
  if (filter.meta === undefined || typeof filter.meta !== 'object' || Array.isArray(filter.meta)) {
    return false;
  }

  return isBoundedJson(value, MAX_INVESTIGATION_TEXT_CHARS);
};

const isQuery = (value: unknown): value is Query => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const query = value as Query;
  if (
    typeof query.language !== 'string' ||
    query.language.length === 0 ||
    query.language.length > MAX_LANGUAGE_CHARS
  ) {
    return false;
  }

  if (typeof query.query === 'string') {
    return query.query.length <= MAX_INVESTIGATION_TEXT_CHARS;
  }

  return (
    query.query !== null &&
    typeof query.query === 'object' &&
    isBoundedJson(query.query, MAX_INVESTIGATION_TEXT_CHARS)
  );
};

const isAggregateQuery = (value: unknown): value is AggregateQuery => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const query = value as AggregateQuery;
  return (
    typeof query.esql === 'string' &&
    query.esql.length <= MAX_INVESTIGATION_TEXT_CHARS &&
    Object.keys(query).length === 1
  );
};

const filterSchema: z.ZodType<Filter> = lazySchema(() =>
  z.custom<Filter>((value) => isFilter(value))
);

const querySchema: z.ZodType<Query | AggregateQuery> = lazySchema(() =>
  z.union([
    z.custom<Query>((value) => isQuery(value)),
    z.custom<AggregateQuery>((value) => isAggregateQuery(value)),
  ])
);

const entityValueSchema = lazySchema(() => z.string().min(1).max(MAX_INVESTIGATION_FIELD_CHARS));

const originSchema = lazySchema(() =>
  z.discriminatedUnion('app', [
    z.strictObject({
      app: z.literal('alerts'),
      alertId: boundedIdSchema,
      ruleTypeId: boundedIdSchema,
      alertEnd: boundedIdSchema.optional(),
      logViewId: boundedIdSchema.optional(),
      lookback: z
        .strictObject({
          timeSize: z.number().finite().positive().max(10_000),
          timeUnit: z.enum(['s', 'm', 'h', 'd']),
        })
        .optional(),
    }),
    z.strictObject({
      app: z.literal('dashboard'),
      panelId: boundedIdSchema.optional(),
      panelTitle: z.string().min(1).max(MAX_INVESTIGATION_FIELD_CHARS).optional(),
    }),
    z.strictObject({
      app: z.literal('discover'),
      surface: z.enum(['histogram', 'appMenu', 'document']),
      documentId: boundedIdSchema.optional(),
    }),
  ])
);

export const investigationSeedSchema = lazySchema(() =>
  z
    .strictObject({
      origin: originSchema,
      timeRange: z.strictObject({
        from: boundedIdSchema,
        to: boundedIdSchema,
      }),
      selection: z
        .strictObject({
          start: z.number().finite(),
          end: z.number().finite(),
        })
        .optional(),
      query: querySchema.optional(),
      filters: z.array(filterSchema).max(MAX_INVESTIGATION_FILTERS),
      dataViewId: boundedIdSchema.optional(),
      indexPattern: z.string().min(1).max(MAX_INVESTIGATION_TEXT_CHARS).optional(),
      metric: z
        .strictObject({
          operationType: boundedIdSchema,
          field: boundedIdSchema.optional(),
        })
        .optional(),
      splitField: boundedIdSchema.optional(),
      hosts: z.array(entityValueSchema).max(MAX_INVESTIGATION_HOSTS).optional(),
      entities: z.strictObject({
        'service.name': entityValueSchema.optional(),
        'service.environment': entityValueSchema.optional(),
        'host.name': entityValueSchema.optional(),
        'container.id': entityValueSchema.optional(),
        'trace.id': entityValueSchema.optional(),
        'user.name': entityValueSchema.optional(),
        'source.ip': entityValueSchema.optional(),
      }),
    })
    .superRefine((seed, ctx) => {
      if (seed.selection && seed.selection.end < seed.selection.start) {
        ctx.addIssue({
          code: 'custom',
          message: 'selection.end must be greater than or equal to selection.start',
          path: ['selection', 'end'],
        });
      }
    })
);

export type InvestigationSeed = z.infer<typeof investigationSeedSchema>;

/** Returns true when the seed query is ES|QL, which log and metric analyzers reject. */
export const isEsqlQuery = (query: Query | AggregateQuery): query is AggregateQuery =>
  'esql' in query && typeof query.esql === 'string';

/** Returns up to 10 deduplicated host names from the seed's host list or host entity. */
export const resolveInvestigationHosts = (seed: InvestigationSeed): string[] => {
  const raw = [
    ...(seed.entities['host.name'] ? [seed.entities['host.name']] : []),
    ...(seed.hosts ?? []),
  ];
  return Array.from(new Set(raw.filter((host) => host.length > 0))).slice(
    0,
    MAX_INVESTIGATION_HOSTS
  );
};
