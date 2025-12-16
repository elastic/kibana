/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { schema } from '@kbn/config-schema';
import { SECRET_SAVED_OBJECT_TYPE } from './constants';
import { secretMappings } from './mappings';

const SECRET_SCHEMA_V1 = schema.object({
  name: schema.string(),
  description: schema.string(),
  secret: schema.string(),
  createdAt: schema.string(),
  updatedAt: schema.string(),
});

export function setupSecretsSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  savedObjects.registerType({
    name: SECRET_SAVED_OBJECT_TYPE,
    mappings: secretMappings,
    hidden: true,
    namespaceType: 'multiple-isolated',
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: SECRET_SCHEMA_V1.extends({}, { unknowns: 'ignore' }),
          create: SECRET_SCHEMA_V1,
        },
      },
    },
  });
  encryptedSavedObjects.registerType({
    type: SECRET_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['secret']),
    attributesToIncludeInAAD: new Set(['createdAt']),
  });
}
