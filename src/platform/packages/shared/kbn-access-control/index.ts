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
  PRINCIPAL_TYPES,
  REQUIRED_OPERATIONS,
  RESERVED_OPERATIONS,
  type AccessOperation,
  type AccessPolicy,
  type AclChange,
  type AclDecision,
  type AclDocument,
  type AclDocumentEntry,
  type AclInput,
  type AclLevel,
  type AclObjectDecision,
  type AclState,
  type AclWarning,
  type CanonicalAcl,
  type CanonicalAclEntry,
  type EntryLevel,
  type GeneralAccessLevel,
  type Principal,
  type PrincipalType,
  type ReservedOperation,
} from './src/types';
export { compareLevels, lowestAllowed, maxLevel } from './src/levels';
export { validateAccessPolicy } from './src/policy';
export { ACL_FIELD, normalizeAclSource, toStoredAcl } from './src/normalize';
export {
  evaluateAcl,
  generalAccessPermits,
  getAclState,
  getPrincipalKind,
  isRestricted,
  toObjectDecision,
  type EvaluateAclParams,
} from './src/evaluate';
export { buildAclReadFilter, type BuildAclReadFilterParams } from './src/query';
export {
  AclChangeError,
  MAX_ACL_ENTRIES,
  prepareAclChange,
  prepareInitialAcl,
  toAclDocument,
  type AclChangeErrorCode,
  type PrepareAclChangeParams,
  type PrepareInitialAclParams,
  type PreparedAclChange,
} from './src/change';
export {
  ACL_SHAPE_FIXTURES,
  FIXTURE_POLICY,
  FIXTURE_PROBES,
  type AclShapeFixture,
  type FixtureProbe,
} from './src/contract/shapes';
