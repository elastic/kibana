/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { ISavedObjectsEncryptionExtension } from './encryption';
export type {
  CheckAuthorizationParams,
  AuthorizationTypeEntry,
  AuthorizationTypeMap,
  CheckAuthorizationResult,
  EnforceAuthorizationParams,
  AddAuditEventParams,
  RedactNamespacesParams,
  ISavedObjectsSecurityExtension,
} from './security';
export { AuditAction } from './security';
export type { ISavedObjectsSpacesExtension } from './spaces';
export type { SavedObjectsExtensions } from './extensions';
