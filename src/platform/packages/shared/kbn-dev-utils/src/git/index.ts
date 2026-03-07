/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { getRemoteDefaultBranchRefs } from './get_remote_default_branch_refs';
export { createIndexSnapshotCommit } from './create_index_snapshot_commit';
export { countCommitsBetweenRefs } from './count_commits_between_refs';
export { hasStagedChanges } from './has_staged_changes';
export { resolveNearestMergeBase } from './resolve_nearest_merge_base';
export type { NearestMergeBaseCandidate } from './resolve_nearest_merge_base';
