/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from 'zod';
import { 
  validateIsOneOfLiteralsV1,
  validateTimeWindowUnitsV1,
  validateGroupByV1,
  validationAggregationTypeV1,
} from '../';

const ES_QUERY_MAX_HITS_PER_EXECUTION = 10000;
const MAX_SELECTABLE_GROUP_BY_TERMS = 4;
const MAX_SELECTABLE_SOURCE_FIELDS = 5;

const comparators = {
  GT: '>',
  LT: '<',
  GT_OR_EQ: '>=',
  LT_OR_EQ: '<=',
  BETWEEN: 'between',
  NOT_BETWEEN: 'notBetween',
} as const;

const oneOfLiterals = (arrayOfLiterals: Readonly<string[]>) =>{
  return z.string().superRefine(validateIsOneOfLiteralsV1(arrayOfLiterals));
};

const baseParams = z.object({
  size: z.number().min(0).max(ES_QUERY_MAX_HITS_PER_EXECUTION),
  timeWindowSize: z.number().min(1),
  excludeHitsFromPreviousRun: z.boolean().default(true),
  timeWindowUnit: z.string().superRefine(validateTimeWindowUnitsV1),
  threshold: z.array(z.number()).min(1).max(2),
  thresholdComparator: oneOfLiterals(Object.values(comparators)),
  // aggregation type
  aggType: z.string().default('count').superRefine(validationAggregationTypeV1),
  // aggregation field
  aggField: z.optional(z.string().min(1)),
  // how to group
  groupBy: z.string().default('all').superRefine(validateGroupByV1),
  // field to group on (for groupBy: top)
  termField: z.optional(
    z.union([
      z.string().min(1),
      z.array(z.string()).min(2).max(MAX_SELECTABLE_GROUP_BY_TERMS),
    ])
  ),
  sourceFields: z.optional(
    z.array(
      z.object({
        label: z.string(),
        searchPath: z.string(),
      })
    ).max(MAX_SELECTABLE_SOURCE_FIELDS)
  ),
})

const searchSourceParams = z.object({
  searchType: z.literal('searchSource'),
  timeField: z.optional(z.string().min(1)),
  searchConfiguration: z.object({}).passthrough(),
});

const esQueryParams = z.object({
  searchType: z.literal('esQuery'),
  timeField: z.string().min(1),
  esQuery: z.string().min(1),
  index: z.array(z.string().min(1)).min(1),
});

const esqlQuery = z.object({
  searchType: z.literal('esqlQuery'),
  timeField: z.optional(z.string().min(1)),
  esqlQuery:  z.object({ 
    esql: z.string().min(1) 
  }),
});

export const esQueryZodParamsSchema = z.discriminatedUnion('searchType', [
  baseParams.merge(searchSourceParams),
  baseParams.merge(esQueryParams),
  baseParams.merge(esqlQuery),
]);
