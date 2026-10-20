/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import { PAGE_WORKFLOW_ID_MAX_LENGTH } from './constants';

export const WORKFLOW_PAGE_SAVED_OBJECT_TYPE = 'workflow-page';

const SECRET_HASH_HEX_LENGTH = 64;
// The schema sees the stored value: ESO ciphertext of a 43-character secret, about 184 characters.
const ENCRYPTED_SECRET_MAX_LENGTH = 1024;
const CREATED_AT_MAX_LENGTH = 32;
// ESO ciphertext of a `base64(id:key)` API key.
const ENCRYPTED_API_KEY_MAX_LENGTH = 1024;
const API_KEY_ID_MAX_LENGTH = 256;
const USERNAME_MAX_LENGTH = 1024;

/**
 * One per workflow with a page trigger. `secret` is the URL credential: encrypted, so
 * an author can see the URL again. `secretHash` lets the public route check a URL
 * without decrypting anything. `apiKey` is the run identity: a key of the user who last
 * saved the workflow, minted on save and replaced by the next save.
 */
export interface WorkflowPageAttributes {
  workflowId: string;
  secret: string;
  secretHash: string;
  enabled: boolean;
  createdAt: string;
  apiKey?: string;
  apiKeyId?: string;
  runAsUsername?: string;
}

const workflowPageSchemaV1 = schema.object({
  workflowId: schema.string({ maxLength: PAGE_WORKFLOW_ID_MAX_LENGTH }),
  secret: schema.string({ maxLength: ENCRYPTED_SECRET_MAX_LENGTH }),
  secretHash: schema.string({
    minLength: SECRET_HASH_HEX_LENGTH,
    maxLength: SECRET_HASH_HEX_LENGTH,
  }),
  enabled: schema.boolean(),
  createdAt: schema.string({ maxLength: CREATED_AT_MAX_LENGTH }),
  apiKey: schema.maybe(schema.string({ maxLength: ENCRYPTED_API_KEY_MAX_LENGTH })),
  apiKeyId: schema.maybe(schema.string({ maxLength: API_KEY_ID_MAX_LENGTH })),
  runAsUsername: schema.maybe(schema.string({ maxLength: USERNAME_MAX_LENGTH })),
});

export const registerWorkflowPageType = ({
  savedObjects,
  encryptedSavedObjects,
}: {
  savedObjects: SavedObjectsServiceSetup;
  encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup;
}): void => {
  savedObjects.registerType({
    name: WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
    hidden: true,
    namespaceType: 'multiple-isolated',
    mappings: {
      dynamic: false,
      properties: {
        workflowId: { type: 'keyword', ignore_above: 1024 },
      },
    },
    management: { importableAndExportable: false },
    modelVersions: {
      '1': {
        changes: [],
        schemas: {
          forwardCompatibility: workflowPageSchemaV1.extends({}, { unknowns: 'ignore' }),
          create: workflowPageSchemaV1,
        },
      },
    },
  });

  // `workflowId` never changes and names what the secret opens, so it is bound as AAD.
  encryptedSavedObjects?.registerType({
    type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(['secret', 'apiKey']),
    attributesToIncludeInAAD: new Set(['workflowId']),
  });
};
