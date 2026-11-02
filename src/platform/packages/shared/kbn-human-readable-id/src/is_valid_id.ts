/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isUnsafeId } from './is_unsafe_id';
import {
  HUMAN_READABLE_ID_PATTERN,
  HUMAN_READABLE_ID_MAX_LENGTH,
  HUMAN_READABLE_ID_MIN_LENGTH,
} from './constants';

/**
 * Validates that an ID is safe and matches the human-readable slug format.
 * Rejects prototype-pollution keys, path traversal, and non-slug characters.
 *
 * Does NOT check domain-specific reserved prefixes — consumers should compose
 * this with their own reserved-prefix check when needed.
 *
 * @param maxLength — Upper bound for the ID length. Defaults to {@link HUMAN_READABLE_ID_MAX_LENGTH} (255).
 * @param minLength — Lower bound for the ID length. Defaults to {@link HUMAN_READABLE_ID_MIN_LENGTH} (3).
 */
export const isValidId = (
  id: string,
  maxLength = HUMAN_READABLE_ID_MAX_LENGTH,
  minLength = HUMAN_READABLE_ID_MIN_LENGTH
): boolean =>
  !isUnsafeId(id, maxLength) && id.length >= minLength && HUMAN_READABLE_ID_PATTERN.test(id);
