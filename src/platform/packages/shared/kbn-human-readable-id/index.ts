/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  HUMAN_READABLE_ID_PATTERN,
  HUMAN_READABLE_ID_MAX_LENGTH,
  HUMAN_READABLE_ID_MIN_LENGTH,
  MAX_COLLISION_RETRIES,
} from './src/constants';

export { isUnsafeId } from './src/is_unsafe_id';
export { isValidId } from './src/is_valid_id';
export { generateHumanReadableId } from './src/generate_human_readable_id';
export { buildSuffixedCandidate, buildCandidateIds, resolveCollisionId } from './src/collision';
