/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TestFailure } from './get_failures';
import { GithubIssueMini, GithubApi } from './github_api';
import { getIssueMetadata, updateIssueMetadata } from './issue_metadata';

export function getCiType() {
  return process.env.TEAMCITY_CI ? 'TeamCity' : 'Jenkins';
}

export async function createFailureIssue(buildUrl: string, failure: TestFailure, api: GithubApi) {
  const title = `Failing test: ${failure.classname} - ${failure.name}`;

  const body = updateIssueMetadata(
    [
      'A test failed on a tracked branch',
      '',
      '```',
      failure.failure,
      '```',
      '',
      `First failure: [${getCiType()} Build](${buildUrl})`,
    ].join('\n'),
    {
      'test.class': failure.classname,
      'test.name': failure.name,
      'test.failCount': 1,
    }
  );

  return await api.createIssue(title, body, ['failed-test']);
}

export async function updateFailureIssue(buildUrl: string, issue: GithubIssueMini, api: GithubApi) {
  // Increment failCount
  const newCount = getIssueMetadata(issue.body, 'test.failCount', 0) + 1;
  const newBody = updateIssueMetadata(issue.body, {
    'test.failCount': newCount,
  });

  await api.editIssueBodyAndEnsureOpen(issue.number, newBody);
  await api.addIssueComment(issue.number, `New failure: [${getCiType()} Build](${buildUrl})`);

  return newCount;
}
