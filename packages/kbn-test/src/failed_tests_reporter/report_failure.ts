/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { TestFailure } from './get_failures';
import { GithubIssueMini, GithubApi } from './github_api';
import { getIssueMetadata, updateIssueMetadata } from './issue_metadata';

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
      `First failure: [Jenkins Build](${buildUrl})`,
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
  await api.addIssueComment(issue.number, `New failure: [Jenkins Build](${buildUrl})`);

  return newCount;
}
