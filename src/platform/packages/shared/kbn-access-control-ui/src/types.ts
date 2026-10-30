/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AclLevel,
  AclState,
  AclWarning,
  CanonicalAcl,
  EntryLevel,
  GeneralAccessLevel,
  Principal,
} from '@kbn/access-control';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

/**
 * Response of `GET /internal/security/access_control/{type}/_policy`.
 */
export interface AccessPolicyResponse {
  enabled: boolean;
  general_access: { default: GeneralAccessLevel; allowed: GeneralAccessLevel[] };
  entry_levels: EntryLevel[];
  operations: Record<string, { level: EntryLevel }>;
}

/**
 * Response of `GET /internal/security/access_control/{type}/{id}`. The ACL and profiles are present
 * only for callers who can manage access.
 */
export interface AccessStateResponse {
  type: string;
  id: string;
  version: string;
  state: AclState;
  restricted: boolean;
  is_owner: boolean;
  permissions: string[];
  via_recovery: string[];
  can_claim: boolean;
  current_principal: Principal | null;
  acl?: CanonicalAcl;
  profiles?: UserProfileWithAvatar[];
}

export interface SuggestedUser extends UserProfileWithAvatar {
  /** Levels the user's feature privileges let them use. */
  eligible_levels: EntryLevel[];
}

export interface AccessDraftEntry extends Principal {
  access: EntryLevel;
}

/**
 * Access being edited: general access and named entries. The owner is not part of it.
 */
export interface AccessDraft {
  general_access: GeneralAccessLevel;
  entries: AccessDraftEntry[];
}

export interface AccessChangeResponse {
  version: string;
  warnings: AclWarning[];
}

/**
 * Consumer wording for each level, for example "Can run" for a connector's `use` level.
 */
export type AccessLevelCopy = Partial<Record<AclLevel, { label: string; description: string }>>;
