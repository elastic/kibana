/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { AclAccess, EntryAccess, GeneralAccess } from './src/levels';
export {
  PRINCIPAL_TYPES,
  type Principal,
  type PrincipalType,
  type StoredPrincipal,
} from './src/principals';
export {
  isReservedOperation,
  REQUIRED_OPERATIONS,
  RESERVED_OPERATIONS,
  validateAccessPolicy,
  type AccessOperation,
  type AccessPolicy,
  type ReservedOperation,
} from './src/policy';
export {
  ACL_FIELD,
  ACL_MAPPING,
  getAclState,
  normalizeAclSource,
  toAclSource,
  type Acl,
  type AclEntry,
  type AclGeneral,
  type AclGrant,
  type AclState,
  type StoredAcl,
  type StoredAclEntry,
  type StoredAclGeneral,
} from './src/acl';
export { buildAclReadFilter, type BuildAclReadFilterParams } from './src/read_filter';
export {
  evaluateAcl,
  generalAccessPermits,
  isRestricted,
  toObjectDecision,
  type AclDecision,
  type AclObjectDecision,
  type EvaluateAclParams,
} from './src/evaluation';
export {
  AclChangeError,
  MAX_ACL_ENTRIES,
  prepareAclChange,
  prepareInitialAcl,
  readEditableAcl,
  type AclChange,
  type AclChangeErrorCode,
  type AclWarning,
  type EditableAcl,
  type EditableAclEntry,
  type InitialAccess,
  type PrepareAclChangeParams,
  type PrepareInitialAclParams,
  type PreparedAclChange,
} from './src/changes';
