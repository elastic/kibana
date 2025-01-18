/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TestFailure } from './get_failures';
import { GithubApi } from './github_api';
import { getIssueMetadata, updateIssueMetadata } from './issue_metadata';
import { ExistingFailedTestIssue } from './existing_failed_test_issues';

export async function createFailureIssue(
  buildUrl: string,
  failure: TestFailure,
  api: GithubApi,
  branch: string,
  pipeline: string,
  prependTitle: string = ''
) {
  // PrependTitle is introduced to provide some clarity by prepending the failing test title
  // in order to give the whole info in the title according to each team's preference.
  const title =
    prependTitle && prependTitle.trim() !== ''
      ? `Failing test: ${prependTitle} ${failure.classname} - ${failure.name}`
      : `Failing test: ${failure.classname} - ${failure.name}`;

  // Github API body length maximum is 65536 characters
  // Let's keep consistency with Mocha output that is truncated to 8192 characters
  const failureMaxCharacters = 8192;

  const failureBody =
    failure.failure.length <= failureMaxCharacters
      ? failure.failure
      : [
          failure.failure.substring(0, failureMaxCharacters),
          `[report_failure] output truncated to ${failureMaxCharacters} characters`,
        ].join('\n');

  const body = updateIssueMetadata(
    [
      'A test failed on a tracked branch',
      '',
      '```',
      failureBody,
      '```',
      '',
      `First failure: [${pipeline || 'CI Build'} - ${branch}](${buildUrl})`,
    ].join('\n'),
    {
      'test.class': failure.classname,
      'test.name': failure.name,
      'test.failCount': 1,
    }
  );

  return await api.createIssue(title, body, ['failed-test']);
}

export async function updateFailureIssue(
  buildUrl: string,
  issue: ExistingFailedTestIssue,
  api: GithubApi,
  branch: string,
  pipeline: string
) {
  // Increment failCount
  const newCount = getIssueMetadata(issue.github.body, 'test.failCount', 0) + 1;
  const newBody = updateIssueMetadata(issue.github.body, {
    'test.failCount': newCount,
  });

  await api.editIssueBodyAndEnsureOpen(issue.github.number, newBody);
  await api.addIssueComment(
    issue.github.number,
    `New failure: [${pipeline || 'CI Build'} - ${branch}](${buildUrl})`
  );

  return { newBody, newCount };
}
