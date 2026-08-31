/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type {
  SavedObjectsClient,
  SavedObjectsServiceSetup,
  SavedObjectsUpdateOptions,
} from '@kbn/core/server';
import type { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';

export const WORKFLOW_EXECUTION_IDENTITY_SO_TYPE = 'workflow_execution_identity';

export interface WorkflowExecutionIdentityAttributes {
  workflowId: string;
  apiKey: string | null;
  uiamApiKey?: string | null;
  apiKeyOwner: string | null;
  apiKeyCreatedByUser: boolean | null;
  uiamApiKeyExternal?: boolean | null;
}

export const WorkflowExecutionIdentityAttributesToEncrypt = ['apiKey', 'uiamApiKey'] as const;

/**
 * Rotating keys rewrites the full object so AAD fields may change with the key set.
 */
export const WorkflowExecutionIdentityAttributesIncludedInAAD = [
  'apiKeyOwner',
  'apiKeyCreatedByUser',
  'workflowId',
] as const;

export type WorkflowExecutionIdentityAttributesNotPartiallyUpdatable =
  | (typeof WorkflowExecutionIdentityAttributesToEncrypt)[number]
  | (typeof WorkflowExecutionIdentityAttributesIncludedInAAD)[number];

export type PartiallyUpdateableWorkflowExecutionIdentityAttributes = Partial<
  Omit<
    WorkflowExecutionIdentityAttributes,
    WorkflowExecutionIdentityAttributesNotPartiallyUpdatable
  >
>;

const UNSAFE_PARTIAL_UPDATE_KEYS: readonly string[] = [
  ...WorkflowExecutionIdentityAttributesToEncrypt,
  ...WorkflowExecutionIdentityAttributesIncludedInAAD,
];

export const workflowExecutionIdentityAttributesSchema = schema.object({
  workflowId: schema.string(),
  apiKey: schema.nullable(schema.string()),
  uiamApiKey: schema.maybe(schema.nullable(schema.string())),
  apiKeyOwner: schema.nullable(schema.string()),
  apiKeyCreatedByUser: schema.nullable(schema.boolean()),
  uiamApiKeyExternal: schema.maybe(schema.nullable(schema.boolean())),
});

const workflowExecutionIdentityModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      create: workflowExecutionIdentityAttributesSchema,
      forwardCompatibility: workflowExecutionIdentityAttributesSchema.extends(
        {},
        { unknowns: 'ignore' }
      ),
    },
  },
};

export const omitUnsafePartialUpdateAttributes = (
  attributes: Partial<WorkflowExecutionIdentityAttributes>
): PartiallyUpdateableWorkflowExecutionIdentityAttributes => {
  const safeAttributes: Record<string, unknown> = { ...attributes };
  for (const key of UNSAFE_PARTIAL_UPDATE_KEYS) {
    delete safeAttributes[key];
  }
  return safeAttributes;
};

/** Strips encrypted and AAD attributes so a partial update cannot corrupt ciphertext. */
export async function partiallyUpdateWorkflowExecutionIdentity(
  savedObjectsClient: Pick<SavedObjectsClient, 'update'>,
  id: string,
  attributes: PartiallyUpdateableWorkflowExecutionIdentityAttributes,
  options: SavedObjectsUpdateOptions = {}
): Promise<void> {
  await savedObjectsClient.update(
    WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
    id,
    omitUnsafePartialUpdateAttributes(attributes),
    options
  );
}

export function registerWorkflowExecutionIdentitySavedObject({
  savedObjects,
  encryptedSavedObjects,
}: {
  savedObjects: SavedObjectsServiceSetup;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
}): void {
  savedObjects.registerType({
    name: WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
    hidden: true,
    namespaceType: 'multiple-isolated',
    management: {
      importableAndExportable: false,
    },
    mappings: {
      dynamic: false,
      properties: {
        workflowId: { type: 'keyword' },
        apiKey: { type: 'binary' },
        uiamApiKey: { type: 'binary' },
        apiKeyOwner: { type: 'keyword' },
        apiKeyCreatedByUser: { type: 'boolean' },
        uiamApiKeyExternal: { type: 'boolean' },
      },
    },
    modelVersions: workflowExecutionIdentityModelVersions,
  });

  encryptedSavedObjects.registerType({
    type: WORKFLOW_EXECUTION_IDENTITY_SO_TYPE,
    enforceRandomId: false,
    attributesToEncrypt: new Set(WorkflowExecutionIdentityAttributesToEncrypt),
    attributesToIncludeInAAD: new Set(WorkflowExecutionIdentityAttributesIncludedInAAD),
  });
}
