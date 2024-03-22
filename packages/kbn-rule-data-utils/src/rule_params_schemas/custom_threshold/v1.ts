/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from 'zod';
import { 
  validateKQLStringFilterV1, 
  validateIsOneOfLiteralsV1, 
} from '..';

const Comparators = {
  GT: '>',
  LT: '<',
  GT_OR_EQ: '>=',
  LT_OR_EQ: '<=',
  BETWEEN: 'between',
  OUTSIDE_RANGE: 'outside',
} as const

const Aggregators = {
  COUNT: 'count',
  AVERAGE: 'avg',
  SUM: 'sum',
  MIN: 'min',
  MAX: 'max',
  CARDINALITY: 'cardinality',
  RATE: 'rate',
  P95: 'p95',
  P99: 'p99',
} as const;

const RUNTIME_FIELD_TYPES2 = [
  'keyword',
  'long',
  'double',
  'date',
  'ip',
  'boolean',
  'geo_point',
] as const;

export const oneOfLiterals = (arrayOfLiterals: Readonly<string[]>) =>{
  return z.string().superRefine(validateIsOneOfLiteralsV1(arrayOfLiterals));
};

const serializedFieldFormatSchema = z.object({
  id: z.optional(z.string()),
  params: z.optional(z.any()),
});

const primitiveRuntimeFieldSchemaShared = {
  script: z.optional(
    z.object({
      source: z.string(),
    })
  ),
  format: z.optional(serializedFieldFormatSchema),
  customLabel: z.optional(z.string()),
  popularity: z.optional(z.number().min(0)),
};

const runtimeFieldNonCompositeFieldsSpecTypeSchema = z.enum(
  RUNTIME_FIELD_TYPES2
);

const compositeRuntimeFieldSchemaShared = {
  script: z.optional(
    z.object({
      source: z.string(),
    })
  ),
  fields: z.optional(
    z.record(
      z.object({
        type: runtimeFieldNonCompositeFieldsSpecTypeSchema,
        format: z.optional(serializedFieldFormatSchema),
        customLabel: z.optional(z.string()),
        popularity: z.optional(z.number().min(0)),
      })
    )
  ),
};

const primitiveRuntimeFieldSchema = z.object({
  type: runtimeFieldNonCompositeFieldsSpecTypeSchema,
  ...primitiveRuntimeFieldSchemaShared,
});

const compositeRuntimeFieldSchema = z.object({
  type: z.literal('composite'),
  ...compositeRuntimeFieldSchemaShared,
});

const runtimeFieldSchema = z.union([
  primitiveRuntimeFieldSchema,
  compositeRuntimeFieldSchema,
]);

const fieldSpecSchemaFields = {
  name: z.string().max(1000),
  type: z.string().max(1000).default('string'),
  count: z.optional(z.number().min(0)),
  script: z.optional(z.string().max(1000000)),
  format: z.optional(serializedFieldFormatSchema),
  esTypes: z.optional(z.array(z.string())),
  scripted: z.optional(z.boolean()),
  subType: z.optional(
    z.object({
      multi: z.optional(
        z.object({
          parent: z.string(),
        })
      ),
      nested: z.optional(
        z.object({
          path: z.string(),
        })
      ),
    })
  ),
  customLabel: z.optional(z.string()),
  shortDotsEnable: z.optional(z.boolean()),
  searchable: z.optional(z.boolean()),
  aggregatable: z.optional(z.boolean()),
  readFromDocValues: z.optional(z.boolean()),
  runtimeField: z.optional(runtimeFieldSchema),
};

// Allow and ignore unknowns to make fields transient.
// Because `fields` have a bunch of calculated fields
// this allows to retrieve an index pattern and then to re-create by using the retrieved payload
const fieldSpecSchema = z.object(fieldSpecSchemaFields).nonstrict();

const dataViewSpecSchema = z.object({
  title: z.string(),
  version: z.optional(z.string()),
  id: z.optional(z.string()),
  type: z.optional(z.string()),
  timeFieldName: z.optional(z.string()),
  sourceFilters: z.optional(
    z.array(
      z.object({
        value: z.string(),
        clientId: z.optional(z.union([z.string(), z.number()])),
      })
    )
  ),
  fields: z.optional(z.record(fieldSpecSchema)),
  typeMeta: z.optional(z.object({}).passthrough()),
  fieldFormats: z.optional(z.record(serializedFieldFormatSchema)),
  fieldAttrs: z.optional(
    z.record(
      z.object({
        customLabel: z.optional(z.string()),
        count: z.optional(z.number()),
      })
    )
  ),
  allowNoIndex: z.optional(z.boolean()),
  runtimeFieldMap: z.optional(z.record(runtimeFieldSchema)),
  name: z.optional(z.string()),
  namespaces: z.optional(z.array(z.string())),
  allowHidden: z.optional(z.boolean()),
});

const searchConfigurationSchema = z.object({
  index: z.union([z.string(), dataViewSpecSchema]),
  query: z.object({
    language: z.string().superRefine(validateKQLStringFilterV1),
    query: z.string(),
  }),
  filter: z.optional(
    z.array(
      z.object({
        query: z.optional(z.record(z.any())),
        meta: z.record(z.any()),
      })
    )
  ),
});

const baseCriterion = {
  threshold: z.array(z.number()),
  comparator: oneOfLiterals(Object.values(Comparators)),
  timeUnit: z.string(),
  timeSize: z.number(),
};
const allowedAggregators = Object.values(Aggregators);
allowedAggregators.splice(Object.values(Aggregators).indexOf(Aggregators.COUNT), 1);

const customCriterion = z.object({
  ...baseCriterion,
  aggType: z.optional(z.literal('custom')),
  metric: z.never(),
  metrics: z.array(
    z.union([
      z.object({
        name: z.string(),
        aggType: oneOfLiterals(allowedAggregators),
        field: z.string(),
        filter: z.never(),
      }),
      z.object({
        name: z.string(),
        aggType: z.literal('count'),
        filter: z.optional(z.string().superRefine(validateKQLStringFilterV1)),
        field: z.never(),
      }),
    ])
  ),
  equation: z.optional(z.string()),
  label: z.optional(z.string()),
});

export const customThresholdZodParamsSchema = z.object({
  criteria: z.array(customCriterion),
  groupBy: z.optional(z.union([z.string(), z.array(z.string())])),
  alertOnNoData: z.optional(z.boolean()),
  alertOnGroupDisappear: z.optional(z.boolean()),
  searchConfiguration: searchConfigurationSchema,
}).passthrough();
