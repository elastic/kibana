/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';

const v1 = schema.object({
  aTextAttribute: schema.string(),
  aBooleanAttribute: schema.boolean(),
  anIntegerAttribute: schema.number(),
});

export const OLD_TYPE_NO_MIGRATIONS: Partial<SavedObjectsType> = {
  name: 'old-type-no-migrations',
  mappings: {
    dynamic: false,
    properties: {
      aTextAttribute: { type: 'text' },
      aBooleanAttribute: { type: 'boolean' },
      anIntegerAttribute: { type: 'integer' },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: v1,
        forwardCompatibility: v1.extends({}, { unknowns: 'ignore' }),
      },
    },
  },
};
