/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';

import type { BuildkiteMetadata } from './buildkite_metadata';
import type { ExistingFailedTestIssues } from './existing_failed_test_issues';
import type { GithubApi } from './github_api';

export interface ProcessReportsParams {
  log: ToolingLog;
  existingIssues: ExistingFailedTestIssues;
  buildUrl: string;
  githubApi: GithubApi;
  branch: string;
  pipeline: string;
  prependTitle: string;
  updateGithub: boolean;
  /**
   * Whether failures get per-test issues: a new one for a test no `failed-test` issue tracks yet,
   * a comment on an existing one. Suite issues are updated either way. Off once the daily flaky
   * suite reporter files the issues instead, see `REPORT_FAILED_TESTS_PER_TEST_ISSUES`: the
   * per-test issues are then replaced by suite issues, and a failure no suite issue tracks
   * updates none.
   */
  perTestIssues: boolean;
  /**
   * Whether a failure counted on a suite issue also reopens it and gets a "New failure" comment.
   * Off when the job runs the consistent failure check on the issues' repository, which posts
   * breaks on suite issues instead.
   */
  suiteIssueComments: boolean;
  indexInEs: boolean;
  reportUpdate: boolean;
  bkMeta: BuildkiteMetadata;
}
