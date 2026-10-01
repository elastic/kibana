/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlakyTestBranchStats, FlakyTestEntry } from '@kbn/scout-reporting';
import { isPullRequestRef } from './markdown';

/**
 * Skipped runs this soon after an execution come from configs or targets that skip the test
 * conditionally while others still run it, often in the same build, not from a skip in the code.
 */
export const MIN_SKIPPED_FOR_MS = 12 * 60 * 60 * 1000;

/** The test's latest run on the branch was skipped, well after it last ran there. */
const isSkippedOnBranch = ({ latestRun, latestExecutionAt }: FlakyTestBranchStats): boolean =>
  latestRun?.status === 'skipped' &&
  (!latestExecutionAt ||
    latestRun.timestamp.getTime() - latestExecutionAt.getTime() >= MIN_SKIPPED_FOR_MS);

/** Branches the test failed on within the report window, pull requests left out. */
const failedBranches = (test: FlakyTestEntry): FlakyTestBranchStats[] =>
  test.byBranch.filter(({ branch, failedBuilds }) => failedBuilds > 0 && !isPullRequestRef(branch));

/**
 * Whether a flaky test has been skipped since: on every branch it failed on, its latest run was
 * a skip, at least `MIN_SKIPPED_FOR_MS` after it last ran there. A test skipped on `main` but
 * still failing on a release branch is not, that branch needs a skip too.
 */
export const isSkippedTest = (test: FlakyTestEntry): boolean => {
  const failed = failedBranches(test);
  return failed.length > 0 && failed.every(isSkippedOnBranch);
};

/** `main` and `9.4`, the branches a skipped test failed on, for the log. */
export const skippedBranches = (test: FlakyTestEntry): string[] =>
  failedBranches(test).map(({ branch }) => branch);
