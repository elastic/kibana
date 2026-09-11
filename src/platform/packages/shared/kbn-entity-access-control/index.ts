/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { estypes } from '@elastic/elasticsearch';

export class InvalidAccessControlError extends Error {}

export const ACCESS_CONTROL_MAX_ENTRIES = 100;
export const ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH = 1024;

export type AccessControlMode = 'private' | 'public';

export interface AccessControlEntryInput<Role extends string = string> {
  type: 'user';
  id: string;
  role: Role;
}

export interface AccessControlEntry<Role extends string = string>
  extends AccessControlEntryInput<Role> {
  added_at: string;
}

export interface AccessControl<Role extends string = string> {
  access_mode: AccessControlMode;
  entries: Array<AccessControlEntry<Role>>;
}

export interface AccessControlInput<Role extends string = string> {
  access_mode: AccessControlMode;
  entries?: Array<AccessControlEntryInput<Role>>;
}

/** Creates a bounded ACL input schema with the consumer's supported roles. */
export const createAccessControlSchema = <Role extends string>(roles: readonly [Role, ...Role[]]) =>
  z.object({
    access_mode: z.enum(['private', 'public']),
    entries: z
      .array(
        z.object({
          type: z.literal('user'),
          id: z.string().min(1).max(ACCESS_CONTROL_PRINCIPAL_ID_MAX_LENGTH),
          role: z.enum(roles),
        })
      )
      .max(ACCESS_CONTROL_MAX_ENTRIES)
      .default([]),
  });

/** Validates entries and assigns timestamps while preserving existing membership dates. */
export const prepareAccessControl = <Role extends string>({
  input,
  roles,
  ownerId,
  previous,
  now = new Date().toISOString(),
}: {
  input: AccessControlInput<Role>;
  roles: readonly [Role, ...Role[]];
  ownerId: string;
  previous?: AccessControl<Role>;
  now?: string;
}): AccessControl<Role> => {
  const { access_mode, entries } = createAccessControlSchema(roles).parse(input);
  const seen = new Set<string>();
  const previousDates = new Map(previous?.entries.map(({ id, added_at }) => [id, added_at]));
  const result: Array<AccessControlEntry<Role>> = [];

  for (const entry of entries) {
    if (entry.id === ownerId) {
      continue;
    }
    if (seen.has(entry.id)) {
      throw new InvalidAccessControlError(`Duplicate ACL entry for user "${entry.id}"`);
    }
    seen.add(entry.id);
    result.push({ ...entry, added_at: previousDates.get(entry.id) ?? now });
  }

  return { access_mode, entries: result };
};

/** Checks entity access after the consumer has checked its space and feature privileges. */
export const hasEntityAccess = <Role extends string>({
  accessControl,
  ownerId,
  profileId,
  roles,
  allowPublic = false,
}: {
  accessControl: AccessControl<Role>;
  ownerId: string | undefined;
  profileId: string | undefined;
  roles: readonly Role[];
  allowPublic?: boolean;
}): boolean => {
  if (profileId && ownerId === profileId) {
    return true;
  }
  if (allowPublic && accessControl.access_mode === 'public') {
    return true;
  }
  return Boolean(
    profileId &&
      accessControl.entries.some(
        ({ type, id, role }) => type === 'user' && id === profileId && roles.includes(role)
      )
  );
};

/** Builds a read filter for ACLs where every supported role permits reading. */
export const buildEntityReadAccessQuery = ({
  profileId,
  ownerField,
  accessControlField,
  includeMissing = false,
}: {
  profileId?: string;
  ownerField: string;
  accessControlField: string;
  includeMissing?: boolean;
}): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [
      { term: { [`${accessControlField}.access_mode`]: 'public' } },
      ...(includeMissing
        ? [{ bool: { must_not: { exists: { field: `${accessControlField}.access_mode` } } } }]
        : []),
      ...(profileId
        ? [
            { term: { [ownerField]: profileId } },
            { term: { [`${accessControlField}.entries.id`]: profileId } },
          ]
        : []),
    ],
    minimum_should_match: 1,
  },
});
