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
import { WORKFLOW_SECRET_SAVED_OBJECT_INDEX, WORKFLOW_SECRET_SAVED_OBJECT_TYPE } from './constants';
import { workflowSecretMappings } from './mappings';

export function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) {
  savedObjects.registerType({
    name: WORKFLOW_SECRET_SAVED_OBJECT_TYPE,
    indexPattern: WORKFLOW_SECRET_SAVED_OBJECT_INDEX,
    mappings: workflowSecretMappings,
    hidden: true,
    namespaceType: 'agnostic',
  });
  encryptedSavedObjects.registerType({
    type: WORKFLOW_SECRET_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['secret']),
    attributesToIncludeInAAD: new Set(['name', 'description']),
  });
}
