/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildAclReadFilter,
  evaluateAcl,
  prepareInitialAcl,
  toObjectDecision,
} from '@kbn/access-control';
import {
  SavedObjectsErrorHelpers,
  getAclObjectKey,
  type ISavedObjectsAclExtension,
  type ISavedObjectTypeRegistry,
} from '@kbn/core-saved-objects-server';

/**
 * ACL extension that Core uses when no provider can enforce object-level security for a request,
 * for example when the Security plugin is missing or the license does not allow it. It knows no
 * principal and no recovery authority, so only general access applies: restricted objects stay
 * hidden, and nobody can restrict an object or change its access.
 *
 * Deliberately disabled object-level security is a different, trusted state that the Security
 * plugin provides. A missing provider must never be read as that state.
 */
export const createFailClosedAclExtension = (
  typeRegistry: ISavedObjectTypeRegistry
): ISavedObjectsAclExtension => ({
  async getReadFilters({ namespacesByType }) {
    const filters = new Map();
    for (const [type, namespaces] of namespacesByType) {
      const policy = typeRegistry.getAccessPolicy(type);
      if (policy) {
        filters.set(
          type,
          buildAclReadFilter({
            policy,
            level: 'view',
            recoverySpaces: [],
            ordinarySpaces: namespaces,
          })
        );
      }
    }
    return filters;
  },

  async authorizeObjects({ operation, objects }) {
    const decisions = new Map();
    for (const { type, id, acl } of objects) {
      const policy = typeRegistry.getAccessPolicy(type);
      if (policy) {
        decisions.set(
          getAclObjectKey(type, id),
          toObjectDecision(evaluateAcl({ policy, acl }), operation)
        );
      }
    }
    return decisions;
  },

  async getInitialAcl({ type, requested }) {
    const policy = typeRegistry.getAccessPolicy(type);
    if (!policy) {
      return;
    }

    try {
      return prepareInitialAcl({ policy, requested, enabled: true, now: new Date().toISOString() })
        ?.next;
    } catch (error) {
      throw SavedObjectsErrorHelpers.createBadRequestError(error.message);
    }
  },

  async authorizeAclChange() {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'Object-level access control is unavailable for this request'
    );
  },

  async runInAuditScope(operation) {
    return await operation();
  },
});
