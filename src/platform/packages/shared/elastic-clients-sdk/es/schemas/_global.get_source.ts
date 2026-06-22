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
 * Get a document's source.
 *
 * Get the source of a document.
 * For example:
 *
 * ```
 * GET my-index-000001/_source/1
 * ```
 *
 * You can use the source filtering parameters to control which parts of the `_source` are returned:
 *
 * ```
 * GET my-index-000001/_source/1/?_source_includes=*.id&_source_excludes=entities
 * ```
 */
export const GetSourceRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('A unique document identifier.').meta({ found_in: 'path' }),
  index: IndexName.describe('The name of the index that contains the document.').meta({ found_in: 'path' }),
  preference: z.string().describe('The node or shard the operation should be performed on. By default, the operation is randomized between the shard replicas.').optional().meta({ found_in: 'query' }),
  realtime: z.boolean().describe('If `true`, the request is real-time as opposed to near-real-time.').optional().meta({ found_in: 'query' }),
  refresh: z.boolean().describe('If `true`, the request refreshes the relevant shards before retrieving the document. Setting it to `true` should be done after careful thought and verification that this does not cause a heavy load on the system (and slow down indexing).').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('A custom value used to route operations to a specific shard.').optional().meta({ found_in: 'query' }),
  _source: z.lazy(() => SearchSourceConfigParam).describe('Indicates whether to return the `_source` field (`true` or `false`) or lists the fields to return.').optional().meta({ found_in: 'query' }),
  _source_excludes: Fields.describe('A comma-separated list of source fields to exclude in the response.').optional().meta({ found_in: 'query' }),
  _source_includes: Fields.describe('A comma-separated list of source fields to include in the response.').optional().meta({ found_in: 'query' }),
  version: VersionNumber.describe('The version number for concurrency control. It must match the current version of the document for the request to succeed.').optional().meta({ found_in: 'query' }),
  version_type: VersionType.describe('The version type.').optional().meta({ found_in: 'query' })
}).meta({ id: 'GetSourceRequest' })
export type GetSourceRequest = z.infer<typeof GetSourceRequest>

export const GetSourceResponse = z.any().meta({ id: 'GetSourceResponse' })
export type GetSourceResponse = z.infer<typeof GetSourceResponse>
