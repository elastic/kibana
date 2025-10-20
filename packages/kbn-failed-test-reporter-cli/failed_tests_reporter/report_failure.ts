/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExistingFailedTestIssue } from './existing_failed_test_issues';
import type { TestFailure } from './get_failures';
import type { ScoutTestFailureExtended } from './get_scout_failures';
import type { GithubApi } from './github_api';
import { getIssueMetadata, updateIssueMetadata } from './issue_metadata';

export async function createFailureIssue(
  buildUrl: string,
  failure: TestFailure | ScoutTestFailureExtended,
  api: GithubApi,
  branch: string,
  pipeline: string,
  prependTitle: string = ''
) {
  // Detect if this is a Scout failure by checking for Scout-specific fields
  const isScoutFailure = 'id' in failure && 'target' in failure && 'location' in failure;

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

  // Build issue body with Scout-specific information if applicable
  const bodyContent = [
    'A test failed on a tracked branch',
    '',
    '```',
    failureBody,
    '```',
    '',
    `First failure: [${pipeline || 'CI Build'} - ${branch}](${buildUrl})`,
  ];

  // Add Scout-specific information
  if (isScoutFailure) {
    const scoutFailure = failure as ScoutTestFailureExtended;

    bodyContent.splice(
      2,
      0,
      '',
      '**Scout Test Details:**',
      `- Test ID: ${scoutFailure.id}`,
      `- Target: ${scoutFailure.target}`,
      `- Location: ${scoutFailure.location}`,
      scoutFailure.kibanaModule
        ? `- Kibana Module: ${scoutFailure.kibanaModule.id} (${scoutFailure.kibanaModule.type})`
        : '',
      scoutFailure.attachments?.length
        ? `- Attachments: ${scoutFailure.attachments.length} files`
        : '',
      ''
    );
  }

  const body = updateIssueMetadata(bodyContent.join('\n'), {
    'test.class': failure.classname,
    'test.name': failure.name,
    'test.failCount': 1,
    ...(isScoutFailure && { 'test.type': 'scout' }),
  });

  // Use different labels for Scout vs FTR failures
  const labels = isScoutFailure ? ['failed-test', 'scout-playwright'] : ['failed-test'];

  return await api.createIssue(title, body, labels);
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
