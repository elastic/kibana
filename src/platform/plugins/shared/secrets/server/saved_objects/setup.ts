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
import { SECRET_SAVED_OBJECT_INDEX, SECRET_SAVED_OBJECT_TYPE } from './constants';
import { secretMappings } from './mappings';

export function setupSecretsSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  savedObjects.registerType({
    name: SECRET_SAVED_OBJECT_TYPE,
    indexPattern: SECRET_SAVED_OBJECT_INDEX,
    mappings: secretMappings,
    hidden: true,
    namespaceType: 'agnostic',
  });
  encryptedSavedObjects.registerType({
    type: SECRET_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['secret']),
    attributesToIncludeInAAD: new Set(['name', 'description']),
  });
}
