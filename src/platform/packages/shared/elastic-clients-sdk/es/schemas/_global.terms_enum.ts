/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { Duration, Field, Indices, RequestBase, ShardStatistics, integer } from './_types'
import { QueryDslQueryContainer } from './_types.query_dsl'

/**
 * Get terms in an index.
 *
 * Discover terms that match a partial string in an index.
 * This API is designed for low-latency look-ups used in auto-complete scenarios.
 *
 * > info
 * > The terms enum API may return terms from deleted documents. Deleted documents are initially only marked as deleted. It is not until their segments are merged that documents are actually deleted. Until that happens, the terms enum API will return terms from these documents.
 */
export const TermsEnumRequest = z.object({
  ...RequestBase.shape,
  index: Indices.describe('A comma-separated list of data streams, indices, and index aliases to search. Wildcard (`*`) expressions are supported. To search all data streams or indices, omit this parameter or use `*`  or `_all`.').meta({ found_in: 'path' }),
  field: Field.describe('The string to match at the start of indexed terms. If not provided, all terms in the field are considered.').meta({ found_in: 'body' }),
  size: integer.describe('The number of matching terms to return.').optional().meta({ found_in: 'body' }),
  timeout: Duration.describe('The maximum length of time to spend collecting results. If the timeout is exceeded the `complete` flag set to `false` in the response and the results may be partial or empty.').optional().meta({ found_in: 'body' }),
  case_insensitive: z.boolean().describe('When `true`, the provided search string is matched against index terms without case sensitivity.').optional().meta({ found_in: 'body' }),
  index_filter: z.lazy(() => QueryDslQueryContainer).describe('Filter an index shard if the provided query rewrites to `match_none`.').optional().meta({ found_in: 'body' }),
  string: z.string().describe('The string to match at the start of indexed terms. If it is not provided, all terms in the field are considered. > info > The prefix string cannot be larger than the largest possible keyword value, which is Lucene\'s term byte-length limit of 32766.').optional().meta({ found_in: 'body' }),
  search_after: z.string().describe('The string after which terms in the index should be returned. It allows for a form of pagination if the last result from one request is passed as the `search_after` parameter for a subsequent request.').optional().meta({ found_in: 'body' })
}).meta({ id: 'TermsEnumRequest' })
export type TermsEnumRequest = z.infer<typeof TermsEnumRequest>

export const TermsEnumResponse = z.object({
  _shards: ShardStatistics,
  terms: z.array(z.string()),
  complete: z.boolean().describe('If `false`, the returned terms set may be incomplete and should be treated as approximate. This can occur due to a few reasons, such as a request timeout or a node error.')
}).meta({ id: 'TermsEnumResponse' })
export type TermsEnumResponse = z.infer<typeof TermsEnumResponse>
