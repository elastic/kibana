/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { asCodeRefIdSchema } from '@kbn/as-code-shared-schemas';
import { compositeRuntimeFieldSchema, primitiveRuntimeFieldSchema } from './schema_runtime_field';
import { fieldSettingsBaseSchema } from './schema_field_settings';
import { AS_CODE_DATA_VIEW_REFERENCE_TYPE, AS_CODE_DATA_VIEW_SPEC_TYPE } from './constants';

export const fieldSettingsSchema = schema.oneOf(
  [compositeRuntimeFieldSchema, primitiveRuntimeFieldSchema, fieldSettingsBaseSchema],
  {
    meta: {
      id: 'kbn-field-settings-entry',
      title: 'Field settings or runtime field',
      description:
        'Display settings for a mapped index field, or a full runtime field definition when `type` is set to a runtime field kind.',
    },
  }
);

export const dataViewReferenceSchema = asCodeRefIdSchema.extends(
  {
    type: schema.literal(AS_CODE_DATA_VIEW_REFERENCE_TYPE),
  },
  {
    meta: {
      id: 'kbn-data-view-reference-schema',
      title: 'Data view reference',
      description:
        'Reuses an existing Kibana data view as the data source. Set `ref_id` to the library item identifier of the data view. Choose `data_view_spec` instead if you want to define the index pattern, time field, and field settings inline.',
    },
  }
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
    field_settings: schema.maybe(
      schema.recordOf(
        schema.string({
          minLength: 1,
          meta: {
            title: 'Field name',
            description:
              'Field name this entry applies to. Use a field from the backing indices for display overrides, or the runtime field name when the entry defines a runtime field. Example: "user.name".',
          },
        }),
        fieldSettingsSchema
      )
    ),
  },
  {
    meta: {
      id: 'kbn-data-view-spec-schema',
      title: 'Data view inline spec',
      description:
        'Defines the data source inline with an index pattern (and optional time field and field settings). Choose `data_view_reference` instead to point at an existing Kibana data view by id.',
    },
  }
);

export const dataViewSchema = schema.discriminatedUnion('type', [
  dataViewReferenceSchema,
  dataViewSpecSchema,
]);
