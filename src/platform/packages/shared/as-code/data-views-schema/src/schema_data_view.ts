/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { AS_CODE_DATA_VIEW_REFERENCE_TYPE, AS_CODE_DATA_VIEW_SPEC_TYPE } from './constants';
import { runtimeFieldSchema } from './schema_runtime_field';

export const dataViewReferenceSchema = schema.object(
  {
    type: schema.literal(AS_CODE_DATA_VIEW_REFERENCE_TYPE),
    id: schema.string({
      meta: {
        description:
          'The id of the Kibana data view to use as the data source. Example: "my-data-view".',
      },
    }),
  },
  { meta: { id: 'dataViewReferenceDataSourceTypeSchema' } }
);

export const dataViewSpecSchema = schema.object(
  {
    type: schema.literal(AS_CODE_DATA_VIEW_SPEC_TYPE),
    index_pattern: schema.string({
      meta: {
        description:
          'The index pattern (Elasticsearch index expression) to use as the data source. Example: "my-index-*".',
      },
    }),
    time_field: schema.maybe(
      schema.string({
        meta: {
          description:
            'The name of the time field in the index. Used for time-based filtering. Example: "@timestamp".',
        },
      })
    ),
    runtime_fields: schema.maybe(schema.arrayOf(runtimeFieldSchema, { maxSize: 100 })),
  },
  { meta: { id: 'dataViewSpecDataSourceTypeSchema' } }
);

export const dataViewSchema = schema.discriminatedUnion('type', [
  dataViewReferenceSchema,
  dataViewSpecSchema,
]);
