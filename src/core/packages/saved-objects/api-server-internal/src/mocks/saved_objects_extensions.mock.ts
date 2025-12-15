/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ISavedObjectsEncryptionExtension,
  ISavedObjectsSecurityExtension,
  ISavedObjectsSpacesExtension,
} from '@kbn/core-saved-objects-server';
import type { Either } from '@kbn/core-saved-objects-api-server';
import type { Payload } from '@hapi/boom';

const createEncryptionExtension = (): jest.Mocked<ISavedObjectsEncryptionExtension> => ({
  isEncryptableType: jest.fn(),
  decryptOrStripResponseAttributes: jest.fn(),
  encryptAttributes: jest.fn(),
  shouldEnforceRandomId: jest.fn(),
});

const createSecurityExtension = (): jest.Mocked<ISavedObjectsSecurityExtension> => ({
  authorizeCreate: jest.fn(),
  authorizeBulkCreate: jest.fn(),
  authorizeUpdate: jest.fn(),
  authorizeBulkUpdate: jest.fn(),
  authorizeDelete: jest.fn(),
  authorizeBulkDelete: jest.fn(),
  authorizeGet: jest.fn(),
  authorizeBulkGet: jest.fn(),
  authorizeCheckConflicts: jest.fn(),
  authorizeRemoveReferences: jest.fn(),
  authorizeOpenPointInTime: jest.fn(),
  auditClosePointInTime: jest.fn(),
  authorizeFind: jest.fn(),
  getFindRedactTypeMap: jest.fn(),
  authorizeAndRedactMultiNamespaceReferences: jest.fn(),
  authorizeAndRedactInternalBulkResolve: jest.fn(),
  redactNamespaces: jest.fn(),
  authorizeUpdateSpaces: jest.fn(),
  authorizeDisableLegacyUrlAliases: jest.fn(),
  auditObjectsForSpaceDeletion: jest.fn(),
  getCurrentUser: jest.fn(),
  includeSavedObjectNames: jest.fn(),
  authorizeChangeAccessControl: jest.fn(),
  filterInaccessibleObjectsForBulkAction: jest
    .fn()
    .mockImplementation(
      (
        expectedResults: Either<
          { type: string; id?: string | undefined; error: Payload },
          { type: string; id: string; esRequestIndex?: number | undefined }
        >[]
      ) => {
        return Promise.resolve(expectedResults);
      }
    ),
});

const createSpacesExtension = (): jest.Mocked<ISavedObjectsSpacesExtension> => ({
  getCurrentNamespace: jest.fn(),
  getSearchableNamespaces: jest.fn(),
  asScopedToNamespace: jest.fn().mockImplementation(createSpacesExtension),
});

const create = () => ({
  encryptionExtension: createEncryptionExtension(),
  securityExtension: createSecurityExtension(),
  spacesExtension: createSpacesExtension(),
});

export const savedObjectsExtensionsMock = {
  create,
  createEncryptionExtension,
  createSecurityExtension,
  createSpacesExtension,
};
