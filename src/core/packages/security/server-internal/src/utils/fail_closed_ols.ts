/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import {
  buildAclReadFilter,
  evaluateAcl,
  prepareInitialAcl,
  toObjectDecision,
  type AccessPolicy,
} from '@kbn/ols';
import type { CoreOlsService } from '@kbn/core-security-server';

/**
 * Where the fail-closed default reads access policies: the Saved Objects type registry.
 */
export interface AccessPolicyRegistry {
  getAccessPolicy(type: string): AccessPolicy | undefined;
}

/**
 * Object-level security used when no security delegate is registered. It knows no principal and no
 * recovery authority, so only general access applies: restricted objects stay hidden and nobody can
 * restrict an object. A missing delegate must never be read as deliberately disabled enforcement.
 */
export const createFailClosedOls = (typeRegistry: AccessPolicyRegistry): CoreOlsService => {
  const requirePolicy = (type: string) => {
    const policy = typeRegistry.getAccessPolicy(type);
    if (!policy) {
      throw new Error(`Type ${type} has no access policy`);
    }
    return policy;
  };

  return {
    asScoped: () => ({
      getPrincipal: async () => undefined,
      evaluate: async ({ type, acl }) => evaluateAcl({ policy: requirePolicy(type), acl }),
      authorize: async ({ type, operation, objects }) => {
        const policy = typeRegistry.getAccessPolicy(type);
        return new Map(
          objects.map(({ id, acl }) => [
            id,
            policy
              ? toObjectDecision(evaluateAcl({ policy, acl }), operation)
              : { status: 'allowed' },
          ])
        );
      },
      filterVisible: async ({ type, objects }) => {
        const policy = typeRegistry.getAccessPolicy(type);
        return policy
          ? objects.filter(({ acl }) => evaluateAcl({ policy, acl }).operations.has('view'))
          : objects;
      },
      getReadFilter: async ({ type, spaceIds }) => {
        const policy = typeRegistry.getAccessPolicy(type);
        return policy
          ? buildAclReadFilter({
              policy,
              level: 'view',
              recoverySpaces: [],
              ordinarySpaces: spaceIds,
            })
          : undefined;
      },
      validateInitialAcl: async ({ type, requested }) => {
        try {
          prepareInitialAcl({
            policy: requirePolicy(type),
            requested,
            enabled: true,
            now: new Date().toISOString(),
          });
        } catch (error) {
          throw Boom.badRequest(error.message);
        }
      },
    }),
  };
};
