/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  AclChangeError,
  buildAclReadFilter,
  evaluateAcl,
  prepareInitialAcl,
  toObjectDecision,
  type AclObjectDecision,
} from '@kbn/ols';
import {
  SavedObjectsErrorHelpers,
  getOlsObjectKey,
  type ISavedObjectsOlsExtension,
  type ISavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-server';

/**
 * OLS extension that Core uses when no provider can enforce object-level security (OLS) for a
 * request, for example when the Security plugin is missing or the license does not allow it. It
 * knows no principal and no recovery authority, so only general access applies: restricted objects
 * stay hidden, writes that need ownership fail, and nobody can restrict an object or change its
 * access.
 *
 * It reports `enabled: true`. Deliberately disabled OLS is a different, trusted state that only
 * the provider sets, and a missing provider must never be read as that state.
 */
export const createFailClosedOlsExtension = (
  typeRegistry: ISavedObjectTypeRegistry
): ISavedObjectsOlsExtension => ({
  enabled: true,

  async getReadFilters({ namespacesByType }) {
    const filters = new Map<string, estypes.QueryDslQueryContainer>();
    for (const [type, namespaces] of namespacesByType) {
      const policy = typeRegistry.getAccessPolicy(type);
      if (policy) {
        filters.set(
          type,
          buildAclReadFilter({
            policy,
            access: 'view',
            recoverySpaces: [],
            ordinarySpaces: namespaces,
          })
        );
      }
    }
    return filters;
  },

  async authorizeObjects({ operation, objects }) {
    const decisions = new Map<string, AclObjectDecision>();
    for (const { type, id, acl } of objects) {
      const policy = typeRegistry.getAccessPolicy(type);
      if (policy) {
        decisions.set(
          getOlsObjectKey(type, id),
          toObjectDecision(evaluateAcl({ policy, acl }), operation)
        );
      }
    }
    return decisions;
  },

  async getInitialAcl({ type, requested }) {
    const policy = typeRegistry.getAccessPolicy(type);
    if (!policy) {
      // The type has no ACL to store the requested access in, so it would be silently lost.
      if (requested) {
        throw SavedObjectsErrorHelpers.createBadRequestError(
          `Access cannot be set because type [${type}] does not support object-level security (OLS)`
        );
      }
      return;
    }

    // Without a principal, nobody can own the object: it gets no ACL, so the type's default
    // general access applies, and any other request is refused.
    try {
      return prepareInitialAcl({ policy, requested, enabled: true, now: new Date().toISOString() })
        ?.next;
    } catch (error) {
      // A refused request is the caller's error. Anything else is a bug and stays a server error.
      if (error instanceof AclChangeError) {
        throw SavedObjectsErrorHelpers.createBadRequestError(error.message);
      }
      throw error;
    }
  },

  async authorizeAclChange() {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'Object-level security (OLS) is unavailable for this request'
    );
  },
});
