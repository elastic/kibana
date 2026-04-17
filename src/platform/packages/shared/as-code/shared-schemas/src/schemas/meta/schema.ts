/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const asCodeMetaSchema = schema.object(
  {
    created_at: schema.maybe(schema.string()),
    created_by: schema.maybe(schema.string()),
    managed: schema.maybe(schema.boolean()),
    owner: schema.maybe(schema.string()),
    updated_at: schema.maybe(schema.string()),
    updated_by: schema.maybe(schema.string()),
    version: schema.maybe(schema.string()),
  },
  {
    meta: {
      id: 'kbn-as-code-meta',
    },
  }
);

export type AsCodeMeta = TypeOf<typeof asCodeMetaSchema>;
