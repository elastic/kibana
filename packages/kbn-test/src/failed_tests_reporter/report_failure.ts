/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TestFailure } from './get_failures';
import { GithubApi } from './github_api';
import { getIssueMetadata, updateIssueMetadata } from './issue_metadata';
import { ExistingFailedTestIssue } from './existing_failed_test_issues';

export async function createFailureIssue(
  buildUrl: string,
  failure: TestFailure,
  api: GithubApi,
  branch: string
) {
  const title = `Failing test: ${failure.classname} - ${failure.name}`;

  const body = updateIssueMetadata(
    [
      'A test failed on a tracked branch',
      '',
      '```',
      failure.failure,
      '```',
      '',
      `First failure: [CI Build - ${branch}](${buildUrl})`,
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
  branch: string
) {
  // Increment failCount
  const newCount = getIssueMetadata(issue.github.body, 'test.failCount', 0) + 1;
  const newBody = updateIssueMetadata(issue.github.body, {
    'test.failCount': newCount,
  });

  await api.editIssueBodyAndEnsureOpen(issue.github.number, newBody);
  await api.addIssueComment(
    issue.github.number,
    `New failure: [CI Build - ${branch}](${buildUrl})`
  );

  return { newBody, newCount };
}
