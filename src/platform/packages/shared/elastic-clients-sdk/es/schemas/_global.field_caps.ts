/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ExpandWildcards, Field, Fields, IndexName, Indices, Metadata, RequestBase } from './_types'
import { MappingRuntimeFields, MappingTimeSeriesMetricType } from './_types.mapping'
import { QueryDslQueryContainer } from './_types.query_dsl'

export const FieldCapsFieldCapability = z.object({
  aggregatable: z.boolean().describe('Whether this field can be aggregated on all indices.'),
  indices: Indices.describe('The list of indices where this field has the same type family, or null if all indices have the same type family for the field.').optional(),
  meta: Metadata.describe('Merged metadata across all indices as a map of string keys to arrays of values. A value length of 1 indicates that all indices had the same value for this key, while a length of 2 or more indicates that not all indices had the same value for this key.').optional(),
  non_aggregatable_indices: Indices.describe('The list of indices where this field is not aggregatable, or null if all indices have the same definition for the field.').optional(),
  non_searchable_indices: Indices.describe('The list of indices where this field is not searchable, or null if all indices have the same definition for the field.').optional(),
  searchable: z.boolean().describe('Whether this field is indexed for search on all indices.'),
  type: z.string(),
  metadata_field: z.boolean().describe('Whether this field is registered as a metadata field.').optional(),
  time_series_dimension: z.boolean().describe('Whether this field is used as a time series dimension.').optional(),
  time_series_metric: MappingTimeSeriesMetricType.describe('Contains metric type if this fields is used as a time series metrics, absent if the field is not used as metric.').optional(),
  non_dimension_indices: z.array(IndexName).describe('If this list is present in response then some indices have the field marked as a dimension and other indices, the ones in this list, do not.').optional(),
  metric_conflicts_indices: z.array(IndexName).describe('The list of indices where this field is present if these indices don’t have the same `time_series_metric` value for this field.').optional()
}).meta({ id: 'FieldCapsFieldCapability' })
export type FieldCapsFieldCapability = z.infer<typeof FieldCapsFieldCapability>

/**
 * Get the field capabilities.
 *
 * Get information about the capabilities of fields among multiple indices.
 *
 * For data streams, the API returns field capabilities among the stream’s backing indices.
 * It returns runtime fields like any other field.
 * For example, a runtime field with a type of keyword is returned the same as any other field that belongs to the `keyword` family.
 */
export const FieldCapsRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and aliases used to limit the request. Supports wildcards (*). To target all data streams and indices, omit this parameter or use * or _all.').optional().meta({ found_in: 'path' }),
  allow_no_indices: z.boolean().describe('A setting that does two separate checks on the index expression. If `false`, the request returns an error (1) if any wildcard expression (including `_all` and `*`) resolves to zero matching indices or (2) if the complete set of resolved indices, aliases or data streams is empty after all expressions are evaluated. If `true`, index expressions that resolve to no indices are allowed and the request returns an empty result.').optional().meta({ found_in: 'query' }),
  expand_wildcards: ExpandWildcards.describe('The type of index that wildcard patterns can match. If the request can target data streams, this argument determines whether wildcard expressions match hidden data streams. Supports comma-separated values, such as `open,hidden`.').optional().meta({ found_in: 'query' }),
  ignore_unavailable: z.boolean().describe('If `false`, the request returns an error if it targets a concrete (non-wildcarded) index, alias, or data stream that is missing, closed, or otherwise unavailable. If `true`, unavailable concrete targets are silently ignored.').optional().meta({ found_in: 'query' }),
  include_unmapped: z.boolean().describe('If true, unmapped fields are included in the response.').optional().meta({ found_in: 'query' }),
  filters: z.union([z.string(), z.array(z.string())]).describe('A comma-separated list of filters to apply to the response.').optional().meta({ found_in: 'query' }),
  types: z.array(z.string()).describe('A comma-separated list of field types to include. Any fields that do not match one of these types will be excluded from the results. It defaults to empty, meaning that all field types are returned.').optional().meta({ found_in: 'query' }),
  include_empty_fields: z.boolean().describe('If false, empty fields are not included in the response.').optional().meta({ found_in: 'query' }),
  fields: Fields.describe('A list of fields to retrieve capabilities for. Wildcard (`*`) expressions are supported.').optional().meta({ found_in: 'body' }),
  index_filter: z.lazy(() => QueryDslQueryContainer).describe('Filter indices if the provided query rewrites to `match_none` on every shard. IMPORTANT: The filtering is done on a best-effort basis, it uses index statistics and mappings to rewrite queries to `match_none` instead of fully running the request. For instance a range query over a date field can rewrite to `match_none` if all documents within a shard (including deleted documents) are outside of the provided range. However, not all queries can rewrite to `match_none` so this API may return an index even if the provided filter matches no document.').optional().meta({ found_in: 'body' }),
  runtime_mappings: z.lazy(() => MappingRuntimeFields).describe('Define ad-hoc runtime fields in the request similar to the way it is done in search requests. These fields exist only as part of the query and take precedence over fields defined with the same name in the index mappings.').optional().meta({ found_in: 'body' })
}).meta({ id: 'FieldCapsRequest' })
export type FieldCapsRequest = z.infer<typeof FieldCapsRequest>

export const FieldCapsResponse = z.object({
  indices: Indices.describe('The list of indices where this field has the same type family, or null if all indices have the same type family for the field.'),
  fields: z.record(Field, z.record(z.string(), FieldCapsFieldCapability))
}).meta({ id: 'FieldCapsResponse' })
export type FieldCapsResponse = z.infer<typeof FieldCapsResponse>
