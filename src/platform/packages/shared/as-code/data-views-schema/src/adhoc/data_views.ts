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
import { commonDataViewSpecSchema } from '../common/data_views';
import { runtimeFieldSchema } from './runtime_fields';

export const dataViewReferenceSchema = schema.object(
  {
    type: schema.literal(AS_CODE_DATA_VIEW_REFERENCE_TYPE),
    ref_id: schema.string({
      meta: {
        description:
          'The id of the Kibana data view to use as the data source. Example: "my-data-view".',
      },
    }),
  },
  { meta: { id: 'kbn-data-view-reference-schema', title: 'Data view reference' } }
);

export const dataViewSpecSchema = commonDataViewSpecSchema.extends(
  {
    type: schema.literal(AS_CODE_DATA_VIEW_SPEC_TYPE),
    runtime_fields: schema.maybe(schema.arrayOf(runtimeFieldSchema, { maxSize: 100 })),
  },
  { meta: { id: 'kbn-data-view-spec-schema', title: 'Data view inline spec' } }
);

export const dataViewSchema = schema.discriminatedUnion('type', [
  dataViewReferenceSchema,
  dataViewSpecSchema,
]);
