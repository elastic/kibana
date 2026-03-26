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
 * Source: elasticsearch-specification repository, operations: bulk, bulk-1, bulk-2, bulk-3
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  bulk1_request,
  bulk1_response,
  bulk2_request,
  bulk2_response,
  bulk3_request,
  bulk3_response,
  bulk_request,
  bulk_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const BULK_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.bulk',
  summary: `Bulk index or delete documents`,
  description: `Bulk index or delete documents.

Perform multiple \`index\`, \`create\`, \`delete\`, and \`update\` actions in a single request.
This reduces overhead and can greatly increase indexing speed.

If the Elasticsearch security features are enabled, you must have the following index privileges for the target data stream, index, or index alias:

* To use the \`create\` action, you must have the \`create_doc\`, \`create\`, \`index\`, or \`write\` index privilege. Data streams support only the \`create\` action.
* To use the \`index\` action, you must have the \`create\`, \`index\`, or \`write\` index privilege.
* To use the \`delete\` action, you must have the \`delete\` or \`write\` index privilege.
* To use the \`update\` action, you must have the \`index\` or \`write\` index privilege.
* To automatically create a data stream or index with a bulk API request, you must have the \`auto_configure\`, \`create_index\`, or \`manage\` index privilege.
* To make the result of a bulk operation visible to search using the \`refresh\` parameter, you must have the \`maintenance\` or \`manage\` index privilege.

Automatic data stream creation requires a matching index template with data stream enabled.

The actions are specified in the request body using a newline delimited JSON (NDJSON) structure:

\`\`\`
action_and_meta_data\\n
optional_source\\n
action_and_meta_data\\n
optional_source\\n
....
action_and_meta_data\\n
optional_source\\n
\`\`\`

The \`index\` and \`create\` actions expect a source on the next line and have the same semantics as the \`op_type\` parameter in the standard index API.
A \`create\` action fails if a document with the same ID already exists in the target
An \`index\` action adds or replaces a document as necessary.

NOTE: Data streams support only the \`create\` action.
To update or delete a document in a data stream, you must target the backing index containing the document.

An \`update\` action expects that the partial doc, upsert, and script and its options are specified on the next line.

A \`delete\` action does not expect a source on the next line and has the same semantics as the standard delete API.

NOTE: The final line of data must end with a newline character (\`\\n\`).
Each newline character may be preceded by a carriage return (\`\\r\`).
When sending NDJSON data to the \`_bulk\` endpoint, use a \`Content-Type\` header of \`application/json\` or \`application/x-ndjson\`.
Because this format uses literal newline characters (\`\\n\`) as delimiters, make sure that the JSON actions and sources are not pretty printed.

If you provide a target in the request path, it is used for any actions that don't explicitly specify an \`_index\` argument.

A note on the format: the idea here is to make processing as fast as possible.
As some of the actions are redirected to other shards on other nodes, only \`action_meta_data\` is parsed on the receiving node side.

Client libraries using this protocol should try and strive to do something similar on the client side, and reduce buffering as much as possible.

There is no "correct" number of actions to perform in a single bulk request.
Experiment with different settings to find the optimal size for your particular workload.
Note that Elasticsearch limits the maximum size of a HTTP request to 100mb by default so clients must ensure that no request exceeds this size.
It is not possible to index a single document that exceeds the size limit, so you must pre-process any such documents into smaller pieces before sending them to Elasticsearch.
For instance, split documents into pages or chapters before indexing them, or store raw binary data in a system outside Elasticsearch and replace the raw data with a link to the external system in the documents that you send to Elasticsearch.

**Client suppport for bulk requests**

Some of the officially supported clients provide helpers to assist with bulk requests and reindexing:

* Go: Check out \`esutil.BulkIndexer\`
* Perl: Check out \`Search::Elasticsearch::Client::5_0::Bulk\` and \`Search::Elasticsearch::Client::5_0::Scroll\`
* Python: Check out \`elasticsearch.helpers.*\`
* JavaScript: Check out \`client.helpers.*\`
* Java: Check out \`co.elastic.clients.elasticsearch._helpers.bulk.BulkIngester\`
* .NET: Check out \`BulkAllObservable\`
* PHP: Check out bulk indexing.
* Ruby: Check out \`Elasticsearch::Helpers::BulkHelper\`

**Submitting bulk requests with cURL**

If you're providing text file input to \`curl\`, you must use the \`--data-binary\` flag instead of plain \`-d\`.
The latter doesn't preserve newlines. For example:

\`\`\`
\$ cat requests
{ "index" : { "_index" : "test", "_id" : "1" } }
{ "field1" : "value1" }
\$ curl -s -H "Content-Type: application/x-ndjson" -XPOST localhost:9200/_bulk --data-binary "@requests"; echo
{"took":7, "errors": false, "items":[{"index":{"_index":"test","_id":"1","_version":1,"result":"created","forced_refresh":false}}]}
\`\`\`

**Optimistic concurrency control**

Each \`index\` and \`delete\` action within a bulk API call may include the \`if_seq_no\` and \`if_primary_term\` parameters in their respective action and meta data lines.
The \`if_seq_no\` and \`if_primary_term\` parameters control how operations are run, based on the last modification to existing documents. See Optimistic concurrency control for more details.

**Versioning**

Each bulk item can include the version value using the \`version\` field.
It automatically follows the behavior of the index or delete operation based on the \`_version\` mapping.
It also support the \`version_type\`.

**Routing**

Each bulk item can include the routing value using the \`routing\` field.
It automatically follows the behavior of the index or delete operation based on the \`_routing\` mapping.

NOTE: Data streams do not support custom routing unless they were created with the \`allow_custom_routing\` setting enabled in the template.

**Wait for active shards**

When making bulk calls, you can set the \`wait_for_active_shards\` parameter to require a minimum number of shard copies to be active before starting to process the bulk request.

**Refresh**

Control when the changes made by this request are visible to search.

NOTE: Only the shards that receive the bulk request will be affected by refresh.
Imagine a \`_bulk?refresh=wait_for\` request with three documents in it that happen to be routed to different shards in an index with five shards.
The request will only wait for those three shards to refresh.
The other two shards that make up the index do not participate in the \`_bulk\` request at all.

You might want to disable the refresh interval temporarily to improve indexing throughput for large bulk requests.
Refer to the linked documentation for step-by-step instructions using the index settings API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk`,
  methods: ['POST', 'PUT'],
  patterns: ['_bulk', '{index}/_bulk'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-bulk',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'include_source_on_error',
      'list_executed_pipelines',
      'pipeline',
      'refresh',
      'routing',
      '_source',
      '_source_excludes',
      '_source_includes',
      'timeout',
      'wait_for_active_shards',
      'require_alias',
      'require_data_stream',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(bulk_request, 'body'),
      ...getShapeAt(bulk_request, 'path'),
      ...getShapeAt(bulk_request, 'query'),
    }),
    z.object({
      ...getShapeAt(bulk1_request, 'body'),
      ...getShapeAt(bulk1_request, 'path'),
      ...getShapeAt(bulk1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(bulk2_request, 'body'),
      ...getShapeAt(bulk2_request, 'path'),
      ...getShapeAt(bulk2_request, 'query'),
    }),
    z.object({
      ...getShapeAt(bulk3_request, 'body'),
      ...getShapeAt(bulk3_request, 'path'),
      ...getShapeAt(bulk3_request, 'query'),
    }),
  ]),
  outputSchema: z.union([bulk_response, bulk1_response, bulk2_response, bulk3_response]),
};
