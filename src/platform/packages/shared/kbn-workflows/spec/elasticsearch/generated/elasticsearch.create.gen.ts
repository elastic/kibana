/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * Generated at: 2025-11-27T07:04:28.206Z
 * Source: elasticsearch-specification repository, operations: create, create-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  create1_request,
  create1_response,
  create_request,
  create_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CREATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.create',
  connectorGroup: 'internal',
  summary: `Create a new document in the index`,
  description: `Create a new document in the index.

You can index a new JSON document with the \`/<target>/_doc/\` or \`/<target>/_create/<_id>\` APIs
Using \`_create\` guarantees that the document is indexed only if it does not already exist.
It returns a 409 response when a document with a same ID already exists in the index.
To update an existing document, you must use the \`/<target>/_doc/\` API.

If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or index alias:

* To add a document using the \`PUT /<target>/_create/<_id>\` or \`POST /<target>/_create/<_id>\` request formats, you must have the \`create_doc\`, \`create\`, \`index\`, or \`write\` index privilege.
* To automatically create a data stream or index with this API request, you must have the \`auto_configure\`, \`create_index\`, or \`manage\` index privilege.

Automatic data stream creation requires a matching index template with data stream enabled.

**Automatically create data streams and indices**

If the request's target doesn't exist and matches an index template with a \`data_stream\` definition, the index operation automatically creates the data stream.

If the target doesn't exist and doesn't match a data stream template, the operation automatically creates the index and applies any matching index templates.

NOTE: Elasticsearch includes several built-in index templates. To avoid naming collisions with these templates, refer to index pattern documentation.

If no mapping exists, the index operation creates a dynamic mapping.
By default, new fields and objects are automatically added to the mapping if needed.

Automatic index creation is controlled by the \`action.auto_create_index\` setting.
If it is \`true\`, any index can be created automatically.
You can modify this setting to explicitly allow or block automatic creation of indices that match specified patterns or set it to \`false\` to turn off automatic index creation entirely.
Specify a comma-separated list of patterns you want to allow or prefix each pattern with \`+\` or \`-\` to indicate whether it should be allowed or blocked.
When a list is specified, the default behaviour is to disallow.

NOTE: The \`action.auto_create_index\` setting affects the automatic creation of indices only.
It does not affect the creation of data streams.

**Routing**

By default, shard placement — or routing — is controlled by using a hash of the document's ID value.
For more explicit control, the value fed into the hash function used by the router can be directly specified on a per-operation basis using the \`routing\` parameter.

When setting up explicit mapping, you can also use the \`_routing\` field to direct the index operation to extract the routing value from the document itself.
This does come at the (very minimal) cost of an additional document parsing pass.
If the \`_routing\` mapping is defined and set to be required, the index operation will fail if no routing value is provided or extracted.

NOTE: Data streams do not support custom routing unless they were created with the \`allow_custom_routing\` setting enabled in the template.

**Distributed**

The index operation is directed to the primary shard based on its route and performed on the actual node containing this shard.
After the primary shard completes the operation, if needed, the update is distributed to applicable replicas.

**Active shards**

To improve the resiliency of writes to the system, indexing operations can be configured to wait for a certain number of active shard copies before proceeding with the operation.
If the requisite number of active shard copies are not available, then the write operation must wait and retry, until either the requisite shard copies have started or a timeout occurs.
By default, write operations only wait for the primary shards to be active before proceeding (that is to say \`wait_for_active_shards\` is \`1\`).
This default can be overridden in the index settings dynamically by setting \`index.write.wait_for_active_shards\`.
To alter this behavior per operation, use the \`wait_for_active_shards request\` parameter.

Valid values are all or any positive integer up to the total number of configured copies per shard in the index (which is \`number_of_replicas\`+1).
Specifying a negative value or a number greater than the number of shard copies will throw an error.

For example, suppose you have a cluster of three nodes, A, B, and C and you create an index index with the number of replicas set to 3 (resulting in 4 shard copies, one more copy than there are nodes).
If you attempt an indexing operation, by default the operation will only ensure the primary copy of each shard is available before proceeding.
This means that even if B and C went down and A hosted the primary shard copies, the indexing operation would still proceed with only one copy of the data.
If \`wait_for_active_shards\` is set on the request to \`3\` (and all three nodes are up), the indexing operation will require 3 active shard copies before proceeding.
This requirement should be met because there are 3 active nodes in the cluster, each one holding a copy of the shard.
However, if you set \`wait_for_active_shards\` to \`all\` (or to \`4\`, which is the same in this situation), the indexing operation will not proceed as you do not have all 4 copies of each shard active in the index.
The operation will timeout unless a new node is brought up in the cluster to host the fourth copy of the shard.

It is important to note that this setting greatly reduces the chances of the write operation not writing to the requisite number of shard copies, but it does not completely eliminate the possibility, because this check occurs before the write operation starts.
After the write operation is underway, it is still possible for replication to fail on any number of shard copies but still succeed on the primary.
The \`_shards\` section of the API response reveals the number of shard copies on which replication succeeded and failed.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-create`,
  methods: ['PUT', 'POST'],
  patterns: ['{index}/_create/{id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-create',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'id'],
    urlParams: [
      'include_source_on_error',
      'pipeline',
      'refresh',
      'require_alias',
      'require_data_stream',
      'routing',
      'timeout',
      'version',
      'version_type',
      'wait_for_active_shards',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(create_request, 'body'),
      ...getShapeAt(create_request, 'path'),
      ...getShapeAt(create_request, 'query'),
    }),
    z.object({
      ...getShapeAt(create1_request, 'body'),
      ...getShapeAt(create1_request, 'path'),
      ...getShapeAt(create1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([create_response, create1_response]),
};
