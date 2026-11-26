/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock, Mocked } from 'vitest';
import type {
  ISavedObjectsEncryptionExtension,
  ISavedObjectsSecurityExtension,
  ISavedObjectsSpacesExtension,
} from '@kbn/core-saved-objects-server';
import type { Either } from '@kbn/core-saved-objects-api-server';
import type { Payload } from '@hapi/boom';

const createEncryptionExtension = (): Mocked<ISavedObjectsEncryptionExtension> => ({
  isEncryptableType: vi.fn(),
  decryptOrStripResponseAttributes: vi.fn() as Mock,
  encryptAttributes: vi.fn() as Mock,
  shouldEnforceRandomId: vi.fn(),
  getEncryptedAttributes: vi.fn(),
});

const createSecurityExtension = (): Mocked<ISavedObjectsSecurityExtension> => ({
  authorizeCreate: vi.fn(),
  authorizeBulkCreate: vi.fn(),
  authorizeUpdate: vi.fn(),
  authorizeBulkUpdate: vi.fn(),
  authorizeDelete: vi.fn(),
  authorizeBulkDelete: vi.fn(),
  authorizeGet: vi.fn(),
  authorizeBulkGet: vi.fn(),
  authorizeCheckConflicts: vi.fn(),
  authorizeRemoveReferences: vi.fn(),
  authorizeOpenPointInTime: vi.fn(),
  auditClosePointInTime: vi.fn(),
  authorizeFind: vi.fn(),
  getFindRedactTypeMap: vi.fn(),
  authorizeAndRedactMultiNamespaceReferences: vi.fn(),
  authorizeAndRedactInternalBulkResolve: vi.fn() as Mock,
  redactNamespaces: vi.fn() as Mock,
  authorizeUpdateSpaces: vi.fn(),
  authorizeDisableLegacyUrlAliases: vi.fn(),
  auditObjectsForSpaceDeletion: vi.fn(),
  getCurrentUser: vi.fn(),
  includeSavedObjectNames: vi.fn(),
  authorizeChangeAccessControl: vi.fn(),
  filterInaccessibleObjectsForBulkAction: vi
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

const createSpacesExtension = (): Mocked<ISavedObjectsSpacesExtension> => ({
  getCurrentNamespace: vi.fn(),
  getSearchableNamespaces: vi.fn(),
  asScopedToNamespace: vi.fn().mockImplementation(createSpacesExtension),
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
