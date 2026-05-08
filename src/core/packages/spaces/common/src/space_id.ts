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
 * Returns the URL path prefix for the given space (`/s/<spaceId>`),
 * or an empty string for the default space.
 *
 * Accepts plain `string` since this is a pure URL builder; callers are
 * responsible for spaceId validity (e.g. via {@link asSpaceId} at boundaries).
 */
export const getSpaceUrlPrefix = (spaceId: string): string =>
  spaceId === DEFAULT_SPACE_ID ? '' : `/s/${spaceId}`;
