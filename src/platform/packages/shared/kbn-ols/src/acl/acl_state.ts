/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isGeneralAccessLevel } from '../levels';
import { getPrincipalKind } from '../principals';
import type { AclState, StoredAcl } from './types';

/**
 * Returns the state of a stored ACL. Kibana always writes the version, the owner, and general
 * access, so the ACL is valid only when all three are complete: every version value is `1`, the
 * owner has exactly one known kind and at least one ID, and general access has a value that
 * general access can take. Anything else is damaged data, which never falls back to a type's
 * default. The state doesn't depend on any type's policy, so narrowing a policy later keeps
 * stored ACLs valid.
 *
 * @param acl The stored ACL, as `normalizeAclSource` returns it, or `undefined` when the object
 * has none.
 * @returns `absent` without an ACL, `valid` for a complete one, and `invalid` otherwise.
 */
export const getAclState = (acl: StoredAcl | undefined): AclState => {
  if (!acl) {
    return 'absent';
  }

  const hasVersion = acl.version.length > 0 && acl.version.every((value) => value === 1);
  const hasOwner = getPrincipalKind(acl.owner.type) !== undefined && acl.owner.id.length > 0;
  const hasGeneralAccess = acl.general_access.some(isGeneralAccessLevel);
  return hasVersion && hasOwner && hasGeneralAccess ? 'valid' : 'invalid';
};
