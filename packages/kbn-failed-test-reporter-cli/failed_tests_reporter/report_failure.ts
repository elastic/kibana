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

/**
 * Helper function to detect if a test failure is a Scout failure
 */
function isScoutFailure(failure: TestFailure): failure is ScoutTestFailureExtended {
  return 'id' in failure && 'target' in failure && 'location' in failure;
}

export async function createFailureIssue(
  buildUrl: string,
  failure: TestFailure | ScoutTestFailureExtended,
  api: GithubApi,
  branch: string,
  pipeline: string,
  prependTitle: string = ''
) {
  const isScout = isScoutFailure(failure);

  // For Scout tests, use suite name instead of classname for better clarity
  // For FTR tests, use the existing logic with prependTitle
  const title = isScout
    ? `Failed Test: ${failure.classname} - ${failure.name}`
    : prependTitle && prependTitle.trim() !== ''
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
  if (isScout) {
    const scoutFailure = failure as ScoutTestFailureExtended;

    // Extract Playwright config path from command
    const getPlaywrightConfigPath = (command?: string): string => {
      if (!command) return 'N/A';
      const configMatch = command.match(/--config\s+(\S+)/);
      return configMatch ? configMatch[1] : 'N/A';
    };

    // Create table format for Scout test details
    const scoutDetailsTable = [
      '| Field | Value |',
      '|-------|-------|',
      `| Test ID | ${scoutFailure.id} |`,
      `| Target | ${scoutFailure.target} |`,
      `| Location | ${scoutFailure.location} |`,
      `| Duration | ${(scoutFailure.duration / 1000).toFixed(2) + 's'} |`,
      scoutFailure.kibanaModule
        ? `| Module | ${scoutFailure.kibanaModule.id} (${scoutFailure.kibanaModule.type}) |`
        : '| Module | N/A |',
      `| Config path | ${getPlaywrightConfigPath(scoutFailure.commandLine)} |`,
      `| Code Owners | ${scoutFailure.owners} |`,
    ];

    bodyContent.splice(2, 0, '', '**Scout Test Details:**', '', ...scoutDetailsTable, '');

    // Add screenshot information if available
    if (scoutFailure.attachments && scoutFailure.attachments.length > 0) {
      const hasScreenshots = scoutFailure.attachments.some((attachment) =>
        attachment.contentType.startsWith('image/')
      );

      if (hasScreenshots) {
        bodyContent.push('');
        bodyContent.push(
          'Failure screenshots are available in the Buildkite HTML report and artifacts.'
        );
        bodyContent.push('');
      }
    }
  }

  const body = updateIssueMetadata(bodyContent.join('\n'), {
    'test.class': failure.classname,
    'test.name': failure.name,
    'test.failCount': 1,
    ...(isScout && { 'test.type': 'scout' }),
  });

  // Use different labels for Scout vs FTR failures
  const labels = isScout ? ['failed-test', 'scout-playwright'] : ['failed-test'];

  return await api.createIssue(title, body, labels);
}

export async function updateFailureIssue(
  buildUrl: string,
  issue: ExistingFailedTestIssue,
  api: GithubApi,
  branch: string,
  pipeline: string,
  failure?: TestFailure | ScoutTestFailureExtended
) {
  // Increment failCount
  const newCount = getIssueMetadata(issue.github.body, 'test.failCount', 0) + 1;
  const newBody = updateIssueMetadata(issue.github.body, {
    'test.failCount': newCount,
  });

  await api.editIssueBodyAndEnsureOpen(issue.github.number, newBody);

  // Create comment with target information for Scout failures
  const isScout = failure && isScoutFailure(failure);
  const commentText = isScout
    ? `New failure for "${failure.target}" target: [${
        pipeline || 'CI Build'
      } - ${branch}](${buildUrl})`
    : `New failure: [${pipeline || 'CI Build'} - ${branch}](${buildUrl})`;

  await api.addIssueComment(issue.github.number, commentText);

  return { newBody, newCount };
}
