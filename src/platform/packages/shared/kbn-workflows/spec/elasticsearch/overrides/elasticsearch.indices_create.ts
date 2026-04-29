/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * OVERRIDE FILE
 *
 * Source: elasticsearch-specification repository, operations: indices-create
 * This override fixes the mappings schema to allow implicit object types (properties without explicit "type" field)
 * and uses passthrough() to preserve all mapping properties.
 */

import { z } from '@kbn/zod/v4';

import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';
import {
  indices_create_request,
  indices_create_response,
  indices_types_alias,
  indices_types_index_settings,
  types_index_name,
} from '../generated/schemas/es_openapi_zod.gen';

/**
 * Custom property definition schema that allows implicit object types.
 * In Elasticsearch, when a property has nested `properties` but no explicit `type`,
 * it's implicitly an "object" type. The generated schema requires an explicit `type` field
 * due to its discriminated union structure.
 *
 * This schema allows:
 * - Properties with explicit type (e.g., { type: 'text', analyzer: 'standard' })
 * - Properties with nested properties (implicit object, e.g., { properties: { ... } })
 * - Multi-fields via the `fields` property
 */
const customPropertySchema: z.ZodType = z.lazy(() =>
  z.looseObject({
    type: z.optional(z.string()),
    properties: z.optional(z.record(z.string(), customPropertySchema)),
    fields: z.optional(z.record(z.string(), customPropertySchema)),
  })
);

/**
 * Custom mappings schema that validates the top-level structure
 * while allowing flexible property definitions.
 */
const customMappingsSchema = z.looseObject({
  properties: z.optional(z.record(z.string(), customPropertySchema)),
});

// export contract
export const INDICES_CREATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.create',
  summary: `Create an index`,
  description: `Create an index.

You can use the create index API to add a new index to an Elasticsearch cluster.
When creating an index, you can specify the following:

* Settings for the index.
* Mappings for fields in the index.
* Index aliases

**Wait for active shards**

By default, index creation will only return a response to the client when the primary copies of each shard have been started, or the request times out.
The index creation response will indicate what happened.
For example, \`acknowledged\` indicates whether the index was successfully created in the cluster, \`while shards_acknowledged\` indicates whether the requisite number of shard copies were started for each shard in the index before timing out.
Note that it is still possible for either \`acknowledged\` or \`shards_acknowledged\` to be \`false\`, but for the index creation to be successful.
These values simply indicate whether the operation completed before the timeout.
If \`acknowledged\` is false, the request timed out before the cluster state was updated with the newly created index, but it probably will be created sometime soon.
If \`shards_acknowledged\` is false, then the request timed out before the requisite number of shards were started (by default just the primaries), even if the cluster state was successfully updated to reflect the newly created index (that is to say, \`acknowledged\` is \`true\`).

You can change the default of only waiting for the primary shards to start through the index setting \`index.write.wait_for_active_shards\`.
Note that changing this setting will also affect the \`wait_for_active_shards\` value on all subsequent write operations.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create`,
  methods: ['PUT'],
  patterns: ['{index}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['master_timeout', 'timeout', 'wait_for_active_shards'],
    bodyParams: ['aliases', 'mappings', 'settings'],
  },
  paramsSchema: z.object({
    index: types_index_name,
    aliases: z.optional(z.record(z.string(), indices_types_alias)),
    mappings: z.optional(customMappingsSchema),
    settings: z.optional(indices_types_index_settings),
    ...getShapeAt(indices_create_request, 'query'),
  }),
  outputSchema: indices_create_response,
};
