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

function isScoutFailure(failure: TestFailure): failure is ScoutTestFailureExtended {
  return 'id' in failure && 'target' in failure && 'location' in failure;
}

function truncateFailureBody(failure: string, maxCharacters: number = 8192): string {
  return failure.length <= maxCharacters
    ? failure
    : [
        failure.substring(0, maxCharacters),
        `[report_failure] output truncated to ${maxCharacters} characters`,
      ].join('\n');
}

function getFailureBodyFromIssueBody(body: string): string | undefined {
  const match = body.match(/```[\r\n]+([\s\S]*?)[\r\n]+```/);
  if (!match) {
    return undefined;
  }

  return match[1].trim();
}

function createFTRTitle(failure: TestFailure, prependTitle: string): string {
  if (prependTitle && prependTitle.trim() !== '') {
    return `Failing test: ${prependTitle} ${failure.classname} - ${failure.name}`;
  }
  return `Failing test: ${failure.classname} - ${failure.name}`;
}

function createScoutTitle(failure: ScoutTestFailureExtended): string {
  return `Failing test: ${failure.classname} - ${failure.name}`;
}

function createFTRBody(
  failure: TestFailure,
  buildUrl: string,
  branch: string,
  pipeline: string
): string {
  const failureBody = truncateFailureBody(failure.failure);

  const bodyContent = [
    'A test failed on a tracked branch',
    '',
    '```',
    failureBody,
    '```',
    '',
    `First failure: [${pipeline || 'CI Build'} - ${branch}](${buildUrl})`,
  ];

  return updateIssueMetadata(bodyContent.join('\n'), {
    'test.class': failure.classname,
    'test.name': failure.name,
    'test.failCount': 1,
  });
}

/**
 * Extract Playwright config path from command
 */
function getPlaywrightConfigPath(command?: string): string {
  if (!command) return 'N/A';
  const configMatch = command.match(/--config(?:=|\s+)(\S+)/);
  return configMatch ? configMatch[1] : 'N/A';
}

/**
 * Create issue body for Scout failures
 */
function createScoutBody(
  failure: ScoutTestFailureExtended,
  buildUrl: string,
  branch: string,
  pipeline: string
): string {
  const failureBody = truncateFailureBody(failure.failure);

  // Create table format for Scout test details
  const scoutDetailsTable = [
    '| Field | Value |',
    '|-------|-------|',
    `| Test ID | ${failure.id} |`,
    `| Target | ${failure.target} |`,
    `| Location | ${failure.location} |`,
    `| Duration | ${(failure.duration / 1000).toFixed(2) + 's'} |`,
    failure.kibanaModule
      ? `| Module | ${failure.kibanaModule.id} (${failure.kibanaModule.type}) |`
      : '| Module | N/A |',
    `| Config path | ${getPlaywrightConfigPath(failure.commandLine)} |`,
    `| Code Owners | ${failure.owners} |`,
  ];

  const bodyContent = [
    'A test failed on a tracked branch',
    '',
    '**Scout Test Details:**',
    '',
    ...scoutDetailsTable,
    '',
    '```',
    failureBody,
    '```',
    '',
    `First failure: [${pipeline || 'CI Build'} - ${branch}](${buildUrl})`,
  ];

  // Add screenshot information if available
  if (failure.attachments && failure.attachments.length > 0) {
    const hasScreenshots = failure.attachments.some((attachment) =>
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

  return updateIssueMetadata(bodyContent.join('\n'), {
    'test.class': failure.classname,
    'test.name': failure.name,
    'test.failCount': 1,
    'test.type': 'scout',
  });
}

async function createFTRFailureIssue(
  buildUrl: string,
  failure: TestFailure,
  api: GithubApi,
  branch: string,
  pipeline: string,
  prependTitle: string
) {
  const title = createFTRTitle(failure, prependTitle);
  const body = createFTRBody(failure, buildUrl, branch, pipeline);
  const labels = ['failed-test'];

  return await api.createIssue(title, body, labels);
}

async function createScoutFailureIssue(
  buildUrl: string,
  failure: ScoutTestFailureExtended,
  api: GithubApi,
  branch: string,
  pipeline: string
) {
  const title = createScoutTitle(failure);
  const body = createScoutBody(failure, buildUrl, branch, pipeline);
  const labels = ['failed-test', 'scout-playwright'];

  return await api.createIssue(title, body, labels);
}

export async function createFailureIssue(
  buildUrl: string,
  failure: TestFailure | ScoutTestFailureExtended,
  api: GithubApi,
  branch: string,
  pipeline: string,
  prependTitle: string = ''
) {
  if (isScoutFailure(failure)) {
    return createScoutFailureIssue(buildUrl, failure, api, branch, pipeline);
  } else {
    return createFTRFailureIssue(buildUrl, failure, api, branch, pipeline, prependTitle);
  }
}

function createFTRComment(buildUrl: string, branch: string, pipeline: string): string {
  return `New failure: [${pipeline || 'CI Build'} - ${branch}](${buildUrl})`;
}

function createScoutComment(
  failure: ScoutTestFailureExtended,
  buildUrl: string,
  branch: string,
  pipeline: string,
  newErrorMessage?: string
): string {
  const base = `New failure for "${failure.target}" target: [${
    pipeline || 'CI Build'
  } - ${branch}](${buildUrl})`;
  if (!newErrorMessage) {
    /*
     * If there's a failure with the same error message as before, just post a comment
     * with pipeline link and failure target.
     *
     * Example:
     *
     * New failure for "local-serverless-observability_complete" target: [kibana-on-merge - main](https://buildkite.com/elastic/kibana-on-merge/builds/123456)
     */
    return base;
  }

  /*
   * If there's a new error message, include it in the comment. This provides more
   * context on how the failure has changed since the issue was opened or last updated.
   *
   * Example:
   *
   * New failure for "local-serverless-observability_complete" target: [kibana-on-merge - main](https://buildkite.com/elastic/kibana-on-merge/builds/123456)
   *
   * New error message:
   * ```
   * Error: expect(locator).toBeEnabled() failed
   *
   * Locator: locator('notExist')
   * Expected: enabled
   * Timeout: 10000ms
   * Error: element(s) not found
   *
   * Call log:
   *   - Expect "toBeEnabled" with timeout 10000ms
   *   - waiting for locator('notExist')
   * ```
   */

  return `${base}\n\nNew error message:\n\`\`\`\n${newErrorMessage}\n\`\`\``;
}

async function updateFTRFailureIssue(
  buildUrl: string,
  issue: ExistingFailedTestIssue,
  api: GithubApi,
  branch: string,
  pipeline: string
) {
  const newCount = getIssueMetadata(issue.github.body, 'test.failCount', 0) + 1;
  const newBody = updateIssueMetadata(issue.github.body, {
    'test.failCount': newCount,
  });

  await api.editIssueBodyAndEnsureOpen(issue.github.number, newBody);

  const commentText = createFTRComment(buildUrl, branch, pipeline);
  await api.addIssueComment(issue.github.number, commentText);

  return { newBody, newCount };
}

async function updateScoutFailureIssue(
  buildUrl: string,
  issue: ExistingFailedTestIssue,
  api: GithubApi,
  branch: string,
  pipeline: string,
  failure: ScoutTestFailureExtended
) {
  const newCount = getIssueMetadata(issue.github.body, 'test.failCount', 0) + 1;
  const newBody = updateIssueMetadata(issue.github.body, {
    'test.failCount': newCount,
  });

  await api.editIssueBodyAndEnsureOpen(issue.github.number, newBody);

  const previousFailureBody = getFailureBodyFromIssueBody(issue.github.body);
  let newErrorMessage: string | undefined;
  if (failure.errorMessage && previousFailureBody) {
    const currentErrorMsg = truncateFailureBody(failure.errorMessage).trim();
    if (!previousFailureBody.includes(currentErrorMsg)) {
      newErrorMessage = currentErrorMsg;
    }
  }

  const commentText = createScoutComment(failure, buildUrl, branch, pipeline, newErrorMessage);
  await api.addIssueComment(issue.github.number, commentText);

  return { newBody, newCount };
}

export async function updateFailureIssue(
  buildUrl: string,
  issue: ExistingFailedTestIssue,
  api: GithubApi,
  branch: string,
  pipeline: string,
  failure?: TestFailure | ScoutTestFailureExtended
) {
  if (failure && isScoutFailure(failure)) {
    return updateScoutFailureIssue(buildUrl, issue, api, branch, pipeline, failure);
  } else {
    return updateFTRFailureIssue(buildUrl, issue, api, branch, pipeline);
  }
}
