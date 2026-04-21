/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { commonDataViewSpecSchema } from '../common/data_views';
import { storedRuntimeFieldSchema } from './runtime_fields';

export const storedDataViewSchema = commonDataViewSpecSchema.extends(
  {
    id: schema.maybe(
      schema.string({
        meta: {
          description:
            'Kibana provides a unique identifier for each data view, or you can create your own.',
        },
      })
    ),
    name: schema.maybe(
      schema.string({
        meta: {
          description: 'The name of the data view. Example: "Sample data view".',
        },
      })
    ),
    allow_hidden_indices: schema.maybe(
      schema.boolean({
        meta: {
          description: 'Allow hidden and system indices.',
        },
      })
    ),
    runtime_fields: schema.maybe(schema.arrayOf(storedRuntimeFieldSchema, { maxSize: 100 })),
  },
  {
    meta: { id: 'storedDataViewSchema' },
  }
);
