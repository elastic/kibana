/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { WriteResponseBase } from './_global.bulk'
import { Duration, Id, IndexName, Refresh, RequestBase, Routing, SequenceNumber, VersionNumber, VersionType, WaitForActiveShards, long } from './_types'

/**
 * Delete a document.
 *
 * Remove a JSON document from the specified index.
 *
 * NOTE: You cannot send deletion requests directly to a data stream.
 * To delete a document in a data stream, you must target the backing index containing the document.
 *
 * **Optimistic concurrency control**
 *
 * Delete operations can be made conditional and only be performed if the last modification to the document was assigned the sequence number and primary term specified by the `if_seq_no` and `if_primary_term` parameters.
 * If a mismatch is detected, the operation will result in a `VersionConflictException` and a status code of `409`.
 *
 * **Versioning**
 *
 * Each document indexed is versioned.
 * When deleting a document, the version can be specified to make sure the relevant document you are trying to delete is actually being deleted and it has not changed in the meantime.
 * Every write operation run on a document, deletes included, causes its version to be incremented.
 * The version number of a deleted document remains available for a short time after deletion to allow for control of concurrent operations.
 * The length of time for which a deleted document's version remains available is determined by the `index.gc_deletes` index setting.
 *
 * **Routing**
 *
 * If routing is used during indexing, the routing value also needs to be specified to delete a document.
 *
 * If the `_routing` mapping is set to `required` and no routing value is specified, the delete API throws a `RoutingMissingException` and rejects the request.
 *
 * For example:
 *
 * ```
 * DELETE /my-index-000001/_doc/1?routing=shard-1
 * ```
 *
 * This request deletes the document with ID 1, but it is routed based on the user.
 * The document is not deleted if the correct routing is not specified.
 *
 * **Distributed**
 *
 * The delete operation gets hashed into a specific shard ID.
 * It then gets redirected into the primary shard within that ID group and replicated (if needed) to shard replicas within that ID group.
 */
export const DeleteRequest = z.object({
  ...RequestBase.shape,
  id: Id.describe('A unique identifier for the document.').meta({ found_in: 'path' }),
  index: IndexName.describe('The name of the target index.').meta({ found_in: 'path' }),
  if_primary_term: long.describe('Only perform the operation if the document has this primary term.').optional().meta({ found_in: 'query' }),
  if_seq_no: SequenceNumber.describe('Only perform the operation if the document has this sequence number.').optional().meta({ found_in: 'query' }),
  refresh: Refresh.describe('If `true`, Elasticsearch refreshes the affected shards to make this operation visible to search. If `wait_for`, it waits for a refresh to make this operation visible to search. If `false`, it does nothing with refreshes.').optional().meta({ found_in: 'query' }),
  routing: Routing.describe('A custom value used to route operations to a specific shard.').optional().meta({ found_in: 'query' }),
  timeout: Duration.describe('The period to wait for active shards. This parameter is useful for situations where the primary shard assigned to perform the delete operation might not be available when the delete operation runs. Some reasons for this might be that the primary shard is currently recovering from a store or undergoing relocation. By default, the delete operation will wait on the primary shard to become available for up to 1 minute before failing and responding with an error.').optional().meta({ found_in: 'query' }),
  version: VersionNumber.describe('An explicit version number for concurrency control. It must match the current version of the document for the request to succeed.').optional().meta({ found_in: 'query' }),
  version_type: VersionType.describe('The version type.').optional().meta({ found_in: 'query' }),
  wait_for_active_shards: WaitForActiveShards.describe('The minimum number of shard copies that must be active before proceeding with the operation. You can set it to `all` or any positive integer up to the total number of shards in the index (`number_of_replicas+1`). The default value of `1` means it waits for each primary shard to be active.').optional().meta({ found_in: 'query' })
}).meta({ id: 'DeleteRequest' })
export type DeleteRequest = z.infer<typeof DeleteRequest>

export const DeleteResponse = WriteResponseBase.meta({ id: 'DeleteResponse' })
export type DeleteResponse = z.infer<typeof DeleteResponse>
