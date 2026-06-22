/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { GetGetResult } from './_global.get'
import { SearchSourceConfig, SearchSourceConfigParam } from './_global.search'
import { ErrorCause, Fields, Id, Ids, IndexName, RequestBase, Routing, VersionNumber, VersionType } from './_types'

export const MgetMultiGetError = z.object({
  error: z.lazy(() => ErrorCause),
  _id: Id,
  _index: IndexName
}).meta({ id: 'MgetMultiGetError' })
export type MgetMultiGetError = z.infer<typeof MgetMultiGetError>

export const MgetOperation = z.object({
  _id: Id.describe('The unique document ID.'),
  _index: IndexName.describe('The index that contains the document.').optional(),
  routing: Routing.describe('The key for the primary shard the document resides on. Required if routing is used during indexing.').optional(),
  _source: z.lazy(() => SearchSourceConfig).describe('If `false`, excludes all _source fields.').optional(),
  stored_fields: Fields.describe('The stored fields you want to retrieve.').optional(),
  version: VersionNumber.optional(),
  version_type: VersionType.optional()
}).meta({ id: 'MgetOperation' })
export type MgetOperation = z.infer<typeof MgetOperation>

/**
 * Get multiple documents.
 *
 * Get multiple JSON documents by ID from one or more indices.
 * If you specify an index in the request URI, you only need to specify the document IDs in the request body.
 * To ensure fast responses, this multi get (mget) API responds with partial results if one or more shards fail.
 *
 * **Filter source fields**
 *
 * By default, the `_source` field is returned for every document (if stored).
 * Use the `_source` and `_source_include` or `source_exclude` attributes to filter what fields are returned for a particular document.
 * You can include the `_source`, `_source_includes`, and `_source_excludes` query parameters in the request URI to specify the defaults to use when there are no per-document instructions.
 *
 * **Get stored fields**
 *
 * Use the `stored_fields` attribute to specify the set of stored fields you want to retrieve.
 * Any requested fields that are not stored are ignored.
 * You can include the `stored_fields` query parameter in the request URI to specify the defaults to use when there are no per-document instructions.
 */
export const MgetRequest = z.object({
  ...RequestBase.shape,
  index: IndexName.describe('Name of the index to retrieve documents from when `ids` are specified, or when a document in the `docs` array does not specify an index.').optional().meta({ found_in: 'path' }),
  preference: z.string().describe('Specifies the node or shard the operation should be performed on. Random by default.').optional().meta({ found_in: 'query' }),
  realtime: z.boolean().describe('If `true`, the request is real-time as opposed to near-real-time.').optional().meta({ found_in: 'query' }),
  refresh: z.boolean().describe('If `true`, the request refreshes relevant shards before retrieving documents.').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('Custom value used to route operations to a specific shard.').optional().meta({ found_in: 'query' }),
  _source: z.lazy(() => SearchSourceConfigParam).describe('True or false to return the `_source` field or not, or a list of fields to return.').optional().meta({ found_in: 'query' }),
  _source_excludes: Fields.describe('A comma-separated list of source fields to exclude from the response. You can also use this parameter to exclude fields from the subset specified in `_source_includes` query parameter.').optional().meta({ found_in: 'query' }),
  _source_includes: Fields.describe('A comma-separated list of source fields to include in the response. If this parameter is specified, only these source fields are returned. You can exclude fields from this subset using the `_source_excludes` query parameter. If the `_source` parameter is `false`, this parameter is ignored.').optional().meta({ found_in: 'query' }),
  stored_fields: Fields.describe('If `true`, retrieves the document fields stored in the index rather than the document `_source`.').optional().meta({ found_in: 'query' }),
  docs: z.array(MgetOperation).describe('The documents you want to retrieve. Required if no index is specified in the request URI.').optional().meta({ found_in: 'body' }),
  ids: Ids.describe('The IDs of the documents you want to retrieve. Allowed when the index is specified in the request URI.').optional().meta({ found_in: 'body' })
}).meta({ id: 'MgetRequest' })
export type MgetRequest = z.infer<typeof MgetRequest>

export const MgetResponseItem = z.union([GetGetResult, MgetMultiGetError]).meta({ id: 'MgetResponseItem' })
export type MgetResponseItem = z.infer<typeof MgetResponseItem>

export const MgetResponse = z.object({
  docs: z.array(MgetResponseItem).describe('The response includes a docs array that contains the documents in the order specified in the request. The structure of the returned documents is similar to that returned by the get API. If there is a failure getting a particular document, the error is included in place of the document.')
}).meta({ id: 'MgetResponse' })
export type MgetResponse = z.infer<typeof MgetResponse>
