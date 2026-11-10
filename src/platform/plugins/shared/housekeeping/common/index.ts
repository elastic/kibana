/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const HOUSEKEEPING_APP_ID = 'housekeeping';
export const HOUSEKEEPING_FINDINGS_API_PATH = '/internal/housekeeping/findings';
export const HOUSEKEEPING_RESOURCE_API_PATH = '/internal/housekeeping/resources';

export {
  HOUSEKEEPING_FINDING_KINDS,
  isFindingInScope,
  isFindingKind,
  isResourceUser,
} from './types';
export type {
  HousekeepingFindingKind,
  HousekeepingResource,
  HousekeepingResourceUser,
  HousekeepingResourceTypeInfo,
  HousekeepingFinding,
  HousekeepingFix,
  HousekeepingFindingSeverity,
  HousekeepingFindingAction,
  HousekeepingFindingGroup,
  HousekeepingSkippedCheck,
  HousekeepingFindingsResponse,
  HousekeepingScope,
} from './types';
