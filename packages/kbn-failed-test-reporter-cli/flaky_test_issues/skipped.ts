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

/** A shorter gap means some configs or targets still run the test. */
export const MIN_TIME_SINCE_EXECUTION_MS = 12 * 60 * 60 * 1000;

const isSkippedOnBranch = ({ latestRun, latestExecutionAt }: FlakyTestBranchStats): boolean =>
  latestRun?.status === 'skipped' &&
  (!latestExecutionAt ||
    latestRun.timestamp.getTime() - latestExecutionAt.getTime() >= MIN_TIME_SINCE_EXECUTION_MS);

const failedBranches = (test: FlakyTestEntry): FlakyTestBranchStats[] =>
  test.byBranch.filter(({ branch, failedBuilds }) => failedBuilds > 0 && !isPullRequestRef(branch));

/** Skipped on every branch it failed on, pull requests left out. */
export const isSkippedTest = (test: FlakyTestEntry): boolean => {
  const failed = failedBranches(test);
  return failed.length > 0 && failed.every(isSkippedOnBranch);
};

export const skippedBranches = (test: FlakyTestEntry): string[] =>
  failedBranches(test).map(({ branch }) => branch);
