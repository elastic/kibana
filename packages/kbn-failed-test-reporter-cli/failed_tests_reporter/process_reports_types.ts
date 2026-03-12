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
  indexInEs: boolean;
  reportUpdate: boolean;
  bkMeta: BuildkiteMetadata;
}
