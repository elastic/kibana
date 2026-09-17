/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { AccessControlEntryInput } from '@kbn/entity-access-control';
import { hasEntityAccess, prepareAccessControl } from '@kbn/entity-access-control';
import type {
  SavedObjectAccessControl,
  SavedObjectAccessControlEntry,
} from '@kbn/core-saved-objects-server';

/**
 * The saved object access mode that restricts every operation to the owner and the principals
 * listed in `accessControl.entries`.
 */
export const PRIVATE_ACCESS_MODE = 'private';

const ACCESS_CONTROL_FIELD = 'accessControl';

/** Whether the object is only accessible to its owner and the principals listed in its entries. */
export const isAccessRestricted = (accessControl?: SavedObjectAccessControl): boolean =>
  accessControl?.accessMode === PRIVATE_ACCESS_MODE;

const toEntityAccessControl = (accessControl: SavedObjectAccessControl) => ({
  access_mode: isAccessRestricted(accessControl) ? ('private' as const) : ('public' as const),
  entries: (accessControl.entries ?? []).map(({ type, id, role, added_at: addedAt }) => ({
    type,
    id,
    role,
    added_at: addedAt,
  })),
});

/**
 * Checks whether a user profile may operate on an object with a restricted access mode. Consumers
 * must check space and feature privileges before calling this; an entry never grants a privilege
 * the caller does not already have.
 */
export const hasSavedObjectAccess = ({
  accessControl,
  profileUid,
  roles,
}: {
  /** The access control metadata of the object, if any. */
  accessControl?: SavedObjectAccessControl;
  /** The user profile ID of the caller, if it could be resolved. */
  profileUid?: string;
  /** The roles that permit the operation. When omitted, any granted role permits it. */
  roles?: readonly string[];
}): boolean => {
  if (!accessControl || !isAccessRestricted(accessControl)) {
    return true;
  }

  const entries = accessControl.entries ?? [];
  return hasEntityAccess({
    accessControl: toEntityAccessControl(accessControl),
    ownerId: accessControl.owner,
    profileId: profileUid,
    roles: roles ?? entries.map(({ role }) => role),
  });
};

/**
 * Validates access control input and returns the metadata to store on the object. Duplicate
 * principals are rejected, owner entries are dropped, and existing membership dates are preserved.
 */
export const prepareSavedObjectAccessControl = ({
  accessMode,
  entries = [],
  roles,
  owner,
  previous,
  now,
}: {
  accessMode: SavedObjectAccessControl['accessMode'];
  entries?: Array<Omit<SavedObjectAccessControlEntry, 'added_at'>>;
  /** The roles the saved object type supports. */
  roles: readonly [string, ...string[]];
  owner: string;
  previous?: SavedObjectAccessControl;
  now?: string;
}): SavedObjectAccessControl => {
  const prepared = prepareAccessControl({
    input: {
      access_mode: accessMode === PRIVATE_ACCESS_MODE ? 'private' : 'public',
      entries: entries as AccessControlEntryInput[],
    },
    roles,
    ownerId: owner,
    ...(previous && { previous: toEntityAccessControl(previous) }),
    ...(now && { now }),
  });

  return {
    owner,
    accessMode,
    entries: prepared.entries.map(({ type, id, role, added_at: addedAt }) => ({
      type,
      id,
      role,
      added_at: addedAt,
    })),
  };
};

/**
 * Builds the Elasticsearch filter that hides restricted objects the caller cannot access. Objects
 * without access control metadata, and objects that are not restricted, remain visible.
 */
export const buildSavedObjectAccessControlFilter = (
  profileUid?: string
): estypes.QueryDslQueryContainer => ({
  bool: {
    should: [
      {
        bool: {
          must_not: { term: { [`${ACCESS_CONTROL_FIELD}.accessMode`]: PRIVATE_ACCESS_MODE } },
        },
      },
      ...(profileUid
        ? [
            { term: { [`${ACCESS_CONTROL_FIELD}.owner`]: profileUid } },
            { term: { [`${ACCESS_CONTROL_FIELD}.entries.id`]: profileUid } },
          ]
        : []),
    ],
    minimum_should_match: 1,
  },
});
