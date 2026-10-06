/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
/**
 * Validate an aggregation structure against the declared mappings and
 * aggregation schemas, and rewrite the attribute fields using the KQL-like syntax
 * - `{type}.attributes.{attribute}` to `{type}.{attribute}`
 * - `{type}.{rootField}` to `{rootField}`
 *
 * throws on the first validation error if any is encountered.
 */
export declare const validateAndConvertAggregations: (
  allowedTypes: string[],
  aggs: Record<string, estypes.AggregationsAggregationContainer>,
  indexMapping: IndexMapping
) => Record<string, estypes.AggregationsAggregationContainer>;
