/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISavedObjectsEncryptionExtension } from './encryption';
import type { ISavedObjectsSecurityExtension } from './security';
import { ISavedObjectsSpacesExtension } from './spaces';

export interface SavedObjectsExtensions {
  encryptionExtension: ISavedObjectsEncryptionExtension | undefined;
  securityExtension: ISavedObjectsSecurityExtension | undefined;
  spacesExtension: ISavedObjectsSpacesExtension | undefined;
}
