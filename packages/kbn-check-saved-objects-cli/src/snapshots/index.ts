/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { takeSnapshot } from './take_snapshot';
export { extractMappingsFromSnapshot } from './extract_mappings_from_snapshot';
export { fetchSnapshot, gcsSnapshotUrl } from './fetch_snapshot';
export {
  resolveSnapshotSha,
  snapshotExists,
  getParentCommitSha,
  ATTEMPTS_PER_SHA,
  MAX_ANCESTOR_DEPTH,
  SNAPSHOT_FETCH_RETRY_DELAY_MS,
} from './resolve_snapshot_sha';
export type { ResolvedSnapshotSha, SnapshotCheckResult } from './resolve_snapshot_sha';
export { compareSnapshots } from './compare_snapshots';
export { getNewTypes } from './get_new_types';
export { classifyUpdatedTypes } from './classify_updated_types';
export type { ClassifiedUpdatedTypes } from './classify_updated_types';
export {
  validateChangesNewType,
  validateChangesExistingType,
  validateNoVirtualVersionDowngrade,
} from './validate_changes';
