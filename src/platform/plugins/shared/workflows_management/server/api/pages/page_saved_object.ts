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
import { PAGE_SECRET_MAX_LENGTH, PAGE_WORKFLOW_ID_MAX_LENGTH } from './constants';

export const WORKFLOW_PAGE_SAVED_OBJECT_TYPE = 'workflow-page';

const SECRET_HASH_HEX_LENGTH = 64;
const CREATED_AT_MAX_LENGTH = 32;

/**
 * One per workflow with a page trigger. `secret` is the URL credential: encrypted, so
 * an author can see the URL again. `secretHash` lets the public route check a URL
 * without decrypting anything.
 */
export interface WorkflowPageAttributes {
  workflowId: string;
  secret: string;
  secretHash: string;
  enabled: boolean;
  createdAt: string;
}

const workflowPageSchemaV1 = schema.object({
  workflowId: schema.string({ maxLength: PAGE_WORKFLOW_ID_MAX_LENGTH }),
  secret: schema.string({ maxLength: PAGE_SECRET_MAX_LENGTH }),
  secretHash: schema.string({
    minLength: SECRET_HASH_HEX_LENGTH,
    maxLength: SECRET_HASH_HEX_LENGTH,
  }),
  enabled: schema.boolean(),
  createdAt: schema.string({ maxLength: CREATED_AT_MAX_LENGTH }),
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
    attributesToEncrypt: new Set(['secret']),
    attributesToIncludeInAAD: new Set(['workflowId']),
  });
};
