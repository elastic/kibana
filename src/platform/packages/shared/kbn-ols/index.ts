/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  ACL_LEVELS,
  compareLevels,
  isAclLevel,
  isEntryLevel,
  isGeneralAccessLevel,
  lowestAllowed,
  maxLevel,
  type AclLevel,
  type EntryLevel,
  type GeneralAccessLevel,
} from './src/levels';
export { PRINCIPAL_TYPES, type Principal, type PrincipalType } from './src/principals';
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
  normalizeAclSource,
  toAclSource,
  type Acl,
  type AclEntry,
  type AclState,
  type StoredAcl,
  type StoredAclEntry,
} from './src/acl';
export { buildAclReadFilter, type BuildAclReadFilterParams } from './src/read_filter';
