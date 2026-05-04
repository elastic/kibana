/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { fieldSettingsFieldNameSchema, indexPatternSchema, timeFieldSchema } from './common';
import {
  savedCompositeRuntimeFieldSchema,
  savedPrimitiveRuntimeFieldSchema,
} from '../runtime_fields/schema_saved_runtime_fields';
import { fieldSettingsWithPopularitySchema } from '../schema_field_settings';

export const savedFieldSettingsSchema = schema.oneOf(
  [
    savedCompositeRuntimeFieldSchema,
    savedPrimitiveRuntimeFieldSchema,
    fieldSettingsWithPopularitySchema,
  ],
  {
    meta: {
      id: 'kbn-saved-field-settings-entry',
      title: 'Field settings or runtime field',
      description:
        'Display overrides for an indexed field, or a runtime field definition when `type` is set to a runtime field kind.',
    },
  }
);

export const savedDataViewSpecSchema = schema.object(
  {
    id: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: 256,
        meta: {
          title: 'Data view ID',
          description:
            'Kibana provides a unique identifier for each data view, or you can create your own.',
        },
      })
    ),
    name: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: 256,
        meta: {
          title: 'Data view name',
          description: 'The name of the data view. Example: "Sample data view".',
        },
      })
    ),
    allow_hidden_indices: schema.maybe(
      schema.boolean({
        meta: {
          title: 'Allow hidden and system indices',
          description: 'When `true`, allows the data view to match hidden indices.',
        },
      })
    ),
    index_pattern: indexPatternSchema,
    time_field: timeFieldSchema,
    field_settings: schema.maybe(
      schema.recordOf(fieldSettingsFieldNameSchema, savedFieldSettingsSchema)
    ),
  },
  {
    meta: {
      id: 'kbn-saved-data-view-spec-schema',
      title: 'Saved data view spec',
      description:
        'Defines an stored data source with a mandatory index pattern and optional settings like id, name, show hidden indices and field settings.',
    },
  }
);
