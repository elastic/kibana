/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isUnsafeId } from './is_unsafe_id';
import { humanReadableIdSchema } from './human_readable_id_schema';

/**
 * Validates that an ID is safe and matches the human-readable slug format.
 * Rejects prototype-pollution keys, path traversal, and non-slug characters.
 *
 * Does NOT check domain-specific reserved prefixes — consumers should compose
 * this with their own reserved-prefix check when needed.
 */
export const isValidId = (id: string): boolean =>
  !isUnsafeId(id) && humanReadableIdSchema.safeParse(id).success;
