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

const initialSchema = schema.object({
  aTextAttribute: schema.string(),
  textLength: schema.number(),
  anIntegerAttribute: schema.number(),
});

export const OLD_TYPE_WITH_MIGRATIONS: Partial<SavedObjectsType> = {
  name: 'old-type-with-migrations',
  mappings: {
    dynamic: false,
    properties: {
      aTextAttribute: { type: 'text' },
      aBooleanAttribute: { type: 'boolean' },
      anIntegerAttribute: { type: 'integer' },
    },
  },
  migrations: {
    '8.7.0': (doc) => ({
      ...doc,
      attributes: { ...doc.attributes, textLength: doc.attributes.aTextAttribute.length },
    }),
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: initialSchema,
        forwardCompatibility: initialSchema.extends({}, { unknowns: 'ignore' }),
      },
    },
  },
};
