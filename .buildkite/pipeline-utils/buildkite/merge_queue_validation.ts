/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PIPELINES } from '../ci-stats/pick_test_group_run_order/const.ts';
import type { BuildkiteClient } from './client.ts';
import type { Build } from './types/build.ts';

export const MERGE_QUEUE_BRANCH_PREFIX = 'gh-readonly-queue/';

export type MergeQueueValidation =
  | { status: 'validated'; build: Build }
  | { status: 'not_validated' }
  | { status: 'error'; message: string };

/**
 * Looks for a passed `kibana-merge-queue` build on a queue branch for the commit.
 * Never throws: every failure is reported as `status: 'error'`.
 */
export const findMergeQueueValidation = async (
  client: Pick<BuildkiteClient, 'getBuildsForCommit'>,
  commit: string
): Promise<MergeQueueValidation> => {
  try {
    const builds = await client.getBuildsForCommit(PIPELINES.MERGE_QUEUE, commit, 'passed');
    const build = builds.find(
      ({ state, branch, commit: buildCommit }) =>
        buildCommit === commit && state === 'passed' && branch.startsWith(MERGE_QUEUE_BRANCH_PREFIX)
    );

    return build ? { status: 'validated', build } : { status: 'not_validated' };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) };
  }
};
