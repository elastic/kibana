/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISavedObjectsEncryptionExtension } from './encryption';
import { ISavedObjectsSecurityExtension } from './security';
import { ISavedObjectsSpacesExtension } from './spaces';

/**
 * The SavedObjectsExtensions interface contains the intefaces for three
 * extensions to the saved objects repository. These extensions augment
 * the funtionality of the saved objects repository to provide encryption,
 * security, and spaces features.
 */
export interface SavedObjectsExtensions {
  encryptionExtension: ISavedObjectsEncryptionExtension | undefined;
  securityExtension: ISavedObjectsSecurityExtension | undefined;
  spacesExtension: ISavedObjectsSpacesExtension | undefined;
}

export const ENCRYPTION_EXTENSION_ID = 'encryptedSavedObjects' as const;
export const SECURITY_EXTENSION_ID = 'security' as const;
export const SPACES_EXTENSION_ID = 'spaces' as const;
