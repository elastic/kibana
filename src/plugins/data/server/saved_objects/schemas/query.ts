/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

const FILTERS_SCHEMA = schema.arrayOf(schema.object({}, { unknowns: 'allow' }));

const TIME_FILTER_SCHEMA = schema.object({
  from: schema.string(),
  to: schema.string(),
  refreshInterval: schema.maybe(
    schema.object({
      value: schema.number(),
      pause: schema.boolean(),
    })
  ),
});

// As per `SavedQueryAttributes`
export const SCHEMA_QUERY_BASE = schema.object({
  title: schema.string(),
  description: schema.string({ defaultValue: '' }),
  query: schema.object({
    language: schema.string(),
    query: schema.oneOf([schema.string(), schema.object({}, { unknowns: 'allow' })]),
  }),
  filters: schema.maybe(FILTERS_SCHEMA),
  timefilter: schema.maybe(TIME_FILTER_SCHEMA),
});

export const SCHEMA_QUERY_V8_8_0 = SCHEMA_QUERY_BASE;

export const SCHEMA_QUERY_MODEL_VERSION_1 = SCHEMA_QUERY_BASE;

export const SCHEMA_QUERY_MODEL_VERSION_2 = SCHEMA_QUERY_BASE.extends({
  titleKeyword: schema.string(),
  filters: schema.maybe(schema.nullable(FILTERS_SCHEMA)),
  timefilter: schema.maybe(schema.nullable(TIME_FILTER_SCHEMA)),
});
