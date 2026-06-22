/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { SearchSourceConfigParam } from './_global.search'
import { Fields, Id, IndexName, RequestBase, Routing, SequenceNumber, VersionNumber, VersionType, long } from './_types'

export const GetGetResult = z.object({
  _index: IndexName.describe('The name of the index the document belongs to.'),
  fields: z.record(z.string(), z.any()).describe('If the `stored_fields` parameter is set to `true` and `found` is `true`, it contains the document fields stored in the index.').optional(),
  _ignored: z.array(z.string()).optional(),
  found: z.boolean().describe('Indicates whether the document exists.'),
  _id: Id.describe('The unique identifier for the document.'),
  _primary_term: long.describe('The primary term assigned to the document for the indexing operation.').optional(),
  _routing: z.string().describe('The explicit routing, if set.').optional(),
  _seq_no: SequenceNumber.describe('The sequence number assigned to the document for the indexing operation. Sequence numbers are used to ensure an older version of a document doesn\'t overwrite a newer version.').optional(),
  _source: z.any().describe('If `found` is `true`, it contains the document data formatted in JSON. If the `_source` parameter is set to `false` or the `stored_fields` parameter is set to `true`, it is excluded.').optional(),
  _version: VersionNumber.describe('The document version, which is ncremented each time the document is updated.').optional()
}).meta({ id: 'GetGetResult' })
export type GetGetResult = z.infer<typeof GetGetResult>

/**
 * Get a document by its ID.
 *
 * Get a document and its source or stored fields from an index.
 *
 * By default, this API is realtime and is not affected by the refresh rate of the index (when data will become visible for search).
 * In the case where stored fields are requested with the `stored_fields` parameter and the document has been updated but is not yet refreshed, the API will have to parse and analyze the source to extract the stored fields.
 * To turn off realtime behavior, set the `realtime` parameter to false.
 *
 * **Source filtering**
 *
 * By default, the API returns the contents of the `_source` field unless you have used the `stored_fields` parameter or the `_source` field is turned off.
 * You can turn off `_source` retrieval by using the `_source` parameter:
 *
 * ```
 * GET my-index-000001/_doc/0?_source=false
 * ```
 *
 * If you only need one or two fields from the `_source`, use the `_source_includes` or `_source_excludes` parameters to include or filter out particular fields.
 * This can be helpful with large documents where partial retrieval can save on network overhead
 * Both parameters take a comma separated list of fields or wildcard expressions.
 * For example:
 *
 * ```
 * GET my-index-000001/_doc/0?_source_includes=*.id&_source_excludes=entities
 * ```
 *
 * If you only want to specify includes, you can use a shorter notation:
 *
 * ```
 * GET my-index-000001/_doc/0?_source=*.id
 * ```
 *
 * **Routing**
 *
 * If routing is used during indexing, the routing value also needs to be specified to retrieve a document.
 * For example:
 *
 * ```
 * GET my-index-000001/_doc/2?routing=user1
 * ```
 *
 * This request gets the document with ID 2, but it is routed based on the user.
 * The document is not fetched if the correct routing is not specified.
 *
 * **Distributed**
 *
 * The GET operation is hashed into a specific shard ID.
 * It is then redirected to one of the replicas within that shard ID and returns the result.
 * The replicas are the primary shard and its replicas within that shard ID group.
 * This means that the more replicas you have, the better your GET scaling will be.
 *
 * **Versioning support**
 *
 * You can use the `version` parameter to retrieve the document only if its current version is equal to the specified one.
 *
 * Internally, Elasticsearch has marked the old document as deleted and added an entirely new document.
 * The old version of the document doesn't disappear immediately, although you won't be able to access it.
 * Elasticsearch cleans up deleted documents in the background as you continue to index more data.
 */
export const GetRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('A unique document identifier.').meta({ found_in: 'path' }),
  index: IndexName.describe('The name of the index that contains the document.').meta({ found_in: 'path' }),
  preference: z.string().describe('The node or shard the operation should be performed on. By default, the operation is randomized between the shard replicas. If it is set to `_local`, the operation will prefer to be run on a local allocated shard when possible. If it is set to a custom value, the value is used to guarantee that the same shards will be used for the same custom value. This can help with "jumping values" when hitting different shards in different refresh states. A sample value can be something like the web session ID or the user name.').optional().meta({ found_in: 'query' }),
  realtime: z.boolean().describe('If `true`, the request is real-time as opposed to near-real-time.').optional().meta({ found_in: 'query' }),
  refresh: z.boolean().describe('If `true`, the request refreshes the relevant shards before retrieving the document. Setting it to `true` should be done after careful thought and verification that this does not cause a heavy load on the system (and slow down indexing).').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('A custom value used to route operations to a specific shard.').optional().meta({ found_in: 'query' }),
  _source: z.lazy(() => SearchSourceConfigParam).describe('Indicates whether to return the `_source` field (`true` or `false`) or lists the fields to return.').optional().meta({ found_in: 'query' }),
  _source_excludes: Fields.describe('A comma-separated list of source fields to exclude from the response. You can also use this parameter to exclude fields from the subset specified in `_source_includes` query parameter. If the `_source` parameter is `false`, this parameter is ignored.').optional().meta({ found_in: 'query' }),
  _source_exclude_vectors: z.boolean().describe('Whether vectors should be excluded from _source').optional().meta({ found_in: 'query' }),
  _source_includes: Fields.describe('A comma-separated list of source fields to include in the response. If this parameter is specified, only these source fields are returned. You can exclude fields from this subset using the `_source_excludes` query parameter. If the `_source` parameter is `false`, this parameter is ignored.').optional().meta({ found_in: 'query' }),
  stored_fields: Fields.describe('A comma-separated list of stored fields to return as part of a hit. If no fields are specified, no stored fields are included in the response. If this field is specified, the `_source` parameter defaults to `false`. Only leaf fields can be retrieved with the `stored_fields` option. Object fields can\'t be returned; if specified, the request fails.').optional().meta({ found_in: 'query' }),
  version: VersionNumber.describe('The version number for concurrency control. It must match the current version of the document for the request to succeed.').optional().meta({ found_in: 'query' }),
  version_type: VersionType.describe('The version type.').optional().meta({ found_in: 'query' })
}).meta({ id: 'GetRequest' })
export type GetRequest = z.infer<typeof GetRequest>

export const GetResponse = GetGetResult.meta({ id: 'GetResponse' })
export type GetResponse = z.infer<typeof GetResponse>
