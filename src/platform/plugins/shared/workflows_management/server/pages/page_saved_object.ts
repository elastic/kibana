/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v5 as uuidv5 } from 'uuid';
import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type {
  SavedObjectsClientContract,
  SavedObjectsServiceSetup,
  SavedObjectsUpdateOptions,
} from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { WorkflowPageRef } from './page_secret';

export const WORKFLOW_PAGE_SAVED_OBJECT_TYPE = 'workflow-page';

/** The access levels a page supports. Others (login, public) come later. */
export const WORKFLOW_PAGE_ACCESS_LEVELS = ['secret_link'] as const;
export type WorkflowPageAccessLevel = (typeof WORKFLOW_PAGE_ACCESS_LEVELS)[number];

const ID_MAX_LENGTH = 255;
const SECRET_HASH_HEX_LENGTH = 64;
// The schema sees the stored value: the ESO ciphertext of a 43-character secret.
const ENCRYPTED_SECRET_MAX_LENGTH = 1024;

export const workflowPageAccessSchema = schema.object({
  level: schema.oneOf([schema.literal(WORKFLOW_PAGE_ACCESS_LEVELS[0])]),
});

const workflowPageSchemaV1 = schema.object({
  workflowId: schema.string({ maxLength: ID_MAX_LENGTH }),
  pageId: schema.string({ maxLength: ID_MAX_LENGTH }),
  secret: schema.string({ maxLength: ENCRYPTED_SECRET_MAX_LENGTH }),
  secretHash: schema.string({
    minLength: SECRET_HASH_HEX_LENGTH,
    maxLength: SECRET_HASH_HEX_LENGTH,
  }),
  access: schema.maybe(schema.nullable(workflowPageAccessSchema)),
  offline: schema.boolean(),
});

export type WorkflowPageAccess = TypeOf<typeof workflowPageAccessSchema>;

/**
 * One page of one workflow. `secret` is the URL credential. It is encrypted, so an
 * authorized user can copy the link again. `secretHash` lets the public route check a
 * URL without a decrypt. A page without `access` is offline.
 */
export interface WorkflowPageAttributes {
  workflowId: string;
  pageId: string;
  secret: string;
  secretHash: string;
  access?: WorkflowPageAccess | null;
  offline: boolean;
}

// Keep these lists in sync with the ESO registration below.
const ATTRIBUTES_TO_ENCRYPT = ['secret'] as const;
// Only attributes that never change. Others stay out, so they change without a re-encryption.
const ATTRIBUTES_INCLUDED_IN_AAD = ['workflowId', 'pageId'] as const;

type NotPartiallyUpdatableAttribute =
  | (typeof ATTRIBUTES_TO_ENCRYPT)[number]
  | (typeof ATTRIBUTES_INCLUDED_IN_AAD)[number];

/** The attributes a partial update may change. */
export type PartiallyUpdatableWorkflowPageAttributes = Partial<
  Omit<WorkflowPageAttributes, NotPartiallyUpdatableAttribute | 'secretHash'>
>;

/** Fixed namespace, so one page of one workflow always gets the same saved object id. */
const PAGE_ID_NAMESPACE = '0d8a6f0e-5c2b-4c3e-9a51-7f3c2d1b8e64';

/** Workflow ids are unique across spaces, so the id does not need the space. */
export const getWorkflowPageSavedObjectId = ({
  workflowId,
  pageId,
}: Pick<WorkflowPageRef, 'workflowId' | 'pageId'>): string =>
  uuidv5(`${workflowId}|${pageId}`, PAGE_ID_NAMESPACE);

/**
 * Updates the attributes that are neither encrypted nor in AAD.
 * A partial update of those attributes would make the secret impossible to decrypt.
 */
export const partiallyUpdateWorkflowPage = async (
  client: Pick<SavedObjectsClientContract, 'update'>,
  id: string,
  attributes: PartiallyUpdatableWorkflowPageAttributes,
  options: SavedObjectsUpdateOptions<WorkflowPageAttributes> = {}
): Promise<void> => {
  const { access, offline } = attributes;
  await client.update<WorkflowPageAttributes>(
    WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
    id,
    {
      ...(access !== undefined ? { access } : {}),
      ...(offline !== undefined ? { offline } : {}),
    },
    options
  );
};

export const registerWorkflowPageType = ({
  savedObjects,
  encryptedSavedObjects,
}: {
  savedObjects: SavedObjectsServiceSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}): void => {
  savedObjects.registerType({
    name: WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
    hidden: true,
    namespaceType: 'multiple-isolated',
    mappings: {
      dynamic: false,
      properties: {
        workflowId: { type: 'keyword' },
      },
    },
    // Pages hold a secret and follow their workflow: they never export or import.
    management: { importableAndExportable: false },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          forwardCompatibility: workflowPageSchemaV1.extends({}, { unknowns: 'ignore' }),
          create: workflowPageSchemaV1,
        },
      },
    },
  });

  encryptedSavedObjects.registerType({
    type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
    attributesToEncrypt: new Set(ATTRIBUTES_TO_ENCRYPT),
    attributesToIncludeInAAD: new Set(ATTRIBUTES_INCLUDED_IN_AAD),
  });
};
