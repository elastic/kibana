/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as generateUuid } from 'uuid';
import { toSlugIdentifier } from '@kbn/std';

import { isValidId } from './is_valid_id';

/**
 * Generates a slug-based human-readable ID from a name, or falls back to a
 * `{fallbackPrefix}-{uuid}` ID when the name cannot produce a valid slug.
 *
 * Shared between client-side preview and server-side creation so both sides
 * produce identical IDs for the same input.
 */
export const generateHumanReadableId = (
  name?: string | null,
  options?: { fallbackPrefix?: string }
): string => {
  if (name != null) {
    const slug = toSlugIdentifier(String(name));
    if (isValidId(slug)) {
      return slug;
    }
  }
  const prefix =
    options?.fallbackPrefix != null && options?.fallbackPrefix !== ''
      ? options?.fallbackPrefix
      : 'id';
  return `${prefix}-${generateUuid()}`;
};
