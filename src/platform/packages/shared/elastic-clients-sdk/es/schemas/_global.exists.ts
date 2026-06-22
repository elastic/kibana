/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { SearchSourceConfigParam } from './_global.search'
import { Fields, Id, IndexName, RequestBase, Routing, VersionNumber, VersionType } from './_types'

/**
 * Check a document.
 *
 * Verify that a document exists.
 * For example, check to see if a document with the `_id` 0 exists:
 *
 * ```
 * HEAD my-index-000001/_doc/0
 * ```
 *
 * If the document exists, the API returns a status code of `200 - OK`.
 * If the document doesn’t exist, the API returns `404 - Not Found`.
 *
 * **Versioning support**
 *
 * You can use the `version` parameter to check the document only if its current version is equal to the specified one.
 *
 * Internally, Elasticsearch has marked the old document as deleted and added an entirely new document.
 * The old version of the document doesn't disappear immediately, although you won't be able to access it.
 * Elasticsearch cleans up deleted documents in the background as you continue to index more data.
 */
export const ExistsRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('A unique document identifier.').meta({ found_in: 'path' }),
  index: IndexName.describe('A comma-separated list of data streams, indices, and aliases. It supports wildcards (`*`).').meta({ found_in: 'path' }),
  preference: z.string().describe('The node or shard the operation should be performed on. By default, the operation is randomized between the shard replicas. If it is set to `_local`, the operation will prefer to be run on a local allocated shard when possible. If it is set to a custom value, the value is used to guarantee that the same shards will be used for the same custom value. This can help with "jumping values" when hitting different shards in different refresh states. A sample value can be something like the web session ID or the user name.').optional().meta({ found_in: 'query' }),
  realtime: z.boolean().describe('If `true`, the request is real-time as opposed to near-real-time.').optional().meta({ found_in: 'query' }),
  refresh: z.boolean().describe('If `true`, the request refreshes the relevant shards before retrieving the document. Setting it to `true` should be done after careful thought and verification that this does not cause a heavy load on the system (and slow down indexing).').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('A custom value used to route operations to a specific shard.').optional().meta({ found_in: 'query' }),
  _source: z.lazy(() => SearchSourceConfigParam).describe('Indicates whether to return the `_source` field (`true` or `false`) or lists the fields to return.').optional().meta({ found_in: 'query' }),
  _source_excludes: Fields.describe('A comma-separated list of source fields to exclude from the response. You can also use this parameter to exclude fields from the subset specified in `_source_includes` query parameter. If the `_source` parameter is `false`, this parameter is ignored.').optional().meta({ found_in: 'query' }),
  _source_includes: Fields.describe('A comma-separated list of source fields to include in the response. If this parameter is specified, only these source fields are returned. You can exclude fields from this subset using the `_source_excludes` query parameter. If the `_source` parameter is `false`, this parameter is ignored.').optional().meta({ found_in: 'query' }),
  stored_fields: Fields.describe('A comma-separated list of stored fields to return as part of a hit. If no fields are specified, no stored fields are included in the response. If this field is specified, the `_source` parameter defaults to `false`.').optional().meta({ found_in: 'query' }),
  version: VersionNumber.describe('Explicit version number for concurrency control. The specified version must match the current version of the document for the request to succeed.').optional().meta({ found_in: 'query' }),
  version_type: VersionType.describe('The version type.').optional().meta({ found_in: 'query' })
}).meta({ id: 'ExistsRequest' })
export type ExistsRequest = z.infer<typeof ExistsRequest>

export const ExistsResponse = z.boolean().meta({ id: 'ExistsResponse' })
export type ExistsResponse = z.infer<typeof ExistsResponse>
