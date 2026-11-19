/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AclAccess,
  AclState,
  AclWarning,
  StoredAcl,
  EntryAccess,
  GeneralAccess,
  Principal,
} from '@kbn/ols';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

/**
 * Response of `GET /internal/security/ols/{type}/_policy`.
 */
export interface AccessPolicyResponse {
  enabled: boolean;
  general_access: GeneralAccess[];
  default_general_access: GeneralAccess;
  entry_access: EntryAccess[];
  operations: Record<string, { access: EntryAccess }>;
}

/**
 * Response of `GET /internal/security/ols/{type}/{id}`. The ACL and profiles are present
 * only for callers who can manage access.
 */
export interface AccessStateResponse {
  type: string;
  id: string;
  version: string;
  state: AclState;
  restricted: boolean;
  /** Whether general access alone lets everyone in the space view the object. */
  everyone_can_view: boolean;
  is_owner: boolean;
  permissions: string[];
  /** Permissions the caller has only through recovery, a subset of `permissions`. */
  permissions_via_recovery: string[];
  can_claim: boolean;
  current_principal: Principal | null;
  acl?: StoredAcl;
  profiles?: UserProfileWithAvatar[];
}

export interface SuggestedUser extends UserProfileWithAvatar {
  /** Levels the user's feature privileges let them use. */
  eligible_levels: EntryAccess[];
}

export interface AccessDraftEntry extends Principal {
  access: EntryAccess;
}

/**
 * Access being edited: general access and named entries. The owner is not part of it.
 */
export interface AccessDraft {
  general: { access: GeneralAccess };
  entries: AccessDraftEntry[];
}

export interface AccessChangeResponse {
  version: string;
  warnings: AclWarning[];
}

/**
 * Consumer wording for each level, for example "Can run" for a connector's `use` level.
 */
export type AccessLevelCopy = Partial<Record<AclAccess, { label: string; description: string }>>;
