/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectsEmbeddingExtension } from './embedding';
import type { ISavedObjectsEncryptionExtension } from './encryption';
import type { ISavedObjectsSecurityExtension } from './security';
import type { ISavedObjectsSpacesExtension } from './spaces';

/**
 * The SavedObjectsExtensions interface contains the interfaces for extensions to the saved objects
 * repository. These extensions augment the functionality of the saved objects repository to
 * provide encryption, security, spaces, and (reserved) embedding features.
 */
export interface SavedObjectsExtensions {
  /** The encryption extension - handles encrypting and decrypting attributes of saved objects */
  encryptionExtension?: ISavedObjectsEncryptionExtension;
  /** The security extension - handles action authorization, audit logging, and space redaction */
  securityExtension?: ISavedObjectsSecurityExtension;
  /** The spaces extension - handles retrieving the current space and retrieving available spaces */
  spacesExtension?: ISavedObjectsSpacesExtension;
  /**
   * Reserved embedding extension — defined for the pre-computed / `dense_vector` escape hatch
   * (ADR-2) but not yet invoked by the repository. See {@link ISavedObjectsEmbeddingExtension}.
   */
  embeddingExtension?: ISavedObjectsEmbeddingExtension;
}

export const ENCRYPTION_EXTENSION_ID = 'encryptedSavedObjects' as const;
export const SECURITY_EXTENSION_ID = 'security' as const;
export const SPACES_EXTENSION_ID = 'spaces' as const;
export const EMBEDDING_EXTENSION_ID = 'semanticSearch' as const;
