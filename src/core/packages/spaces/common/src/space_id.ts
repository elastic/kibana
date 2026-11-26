/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const __spaceIdBrand: unique symbol = Symbol('SpaceId');

/**
 * A branded string type for Kibana space identifiers.
 *
 * Use {@link asSpaceId} to create a `SpaceId` from an untrusted string
 * (validates the format), or {@link DEFAULT_SPACE_ID} for the built-in
 * default space.
 */
export type SpaceId = string & { readonly [__spaceIdBrand]: never };

const SPACE_ID_REGEX = /^[a-z0-9_-]+$/;

/**
 * Validates and brands a plain string as a {@link SpaceId}.
 *
 * @throws if `value` does not match `/^[a-z0-9_-]+$/`
 */
export const asSpaceId = (value: string): SpaceId => {
  if (!SPACE_ID_REGEX.test(value)) {
    throw new Error(
      `Invalid space id: "${value}". Must match ${SPACE_ID_REGEX} (lowercase alphanumeric, hyphens, underscores).`
    );
  }
  return value as SpaceId;
};

/**
 * The identifier of the built-in default Kibana space.
 */
export const DEFAULT_SPACE_ID: SpaceId = 'default' as SpaceId;

/**
 * The identifier in a saved object's `namespaces` array when it is shared globally to all spaces.
 *
 * Deliberately not a {@link SpaceId}. This and {@link UNKNOWN_SPACE} are sentinels
 * that stand in place of a space id inside a `namespaces` array; neither names a
 * space that exists, and neither matches `SPACE_ID_REGEX`, so {@link asSpaceId}
 * rejects both. Leaving them as plain string literals is what keeps a sentinel
 * from being passed where a real space is expected.
 */
export const ALL_SPACES_ID = '*';

/**
 * The identifier in a saved object's `namespaces` array when it is shared to an unknown space (e.g., one that the end user is not authorized to see).
 *
 * See {@link ALL_SPACES_ID} for why this is not a {@link SpaceId}.
 */
export const UNKNOWN_SPACE = '?';

/**
 * Returns the URL path prefix for the given space (`/s/<spaceId>`),
 * or an empty string for the default space.
 */
export const getSpaceUrlPrefix = (spaceId: SpaceId): string =>
  spaceId === DEFAULT_SPACE_ID ? '' : `/s/${spaceId}`;
