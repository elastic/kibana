/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TEST_SUITE_TYPES } from './constants';
import { BuildkiteClient, getGithubClient } from '#pipeline-utils';

interface TestSuiteResult {
  name: string;
  success: boolean;
  successCount: number;
  groupSize: number;
}

async function main() {
  // Get buildkite build
  const buildkite = new BuildkiteClient();
  const buildkiteBuild = await buildkite.getBuild(
    process.env.BUILDKITE_PIPELINE_SLUG!,
    process.env.BUILDKITE_BUILD_NUMBER!
  );
  const buildLink = `[${buildkiteBuild.pipeline.slug}#${buildkiteBuild.number}](${buildkiteBuild.web_url})`;

  // Calculate success metrics
  const jobs = buildkiteBuild.jobs;
  const testSuiteRuns = jobs.filter((step) => {
    return TEST_SUITE_TYPES.some((testType) => step.step_key?.includes(testType));
  });
  const testSuiteGroups = groupBy('name', testSuiteRuns);

  const SETUP_STEP_KEYS = ['build', 'scout_flaky_setup'];
  const setupFailed = jobs.some(
    (job) => SETUP_STEP_KEYS.includes(job.step_key ?? '') && job.state !== 'passed'
  );

  const noTestsRan = testSuiteRuns.length === 0;

  const success =
    !setupFailed && !noTestsRan && testSuiteRuns.every((job) => job.state === 'passed');
  const testGroupResults = Object.entries(testSuiteGroups).map(([name, group]) => {
    const passingTests = group.filter((job) => job.state === 'passed');
    return {
      name,
      success: passingTests.length === group.length,
      successCount: passingTests.length,
      groupSize: group.length,
    };
  });

  // Comment results on the PR
  const prNumber = Number(extractPRNumberFromBranch(buildkiteBuild.branch));
  if (isNaN(prNumber)) {
    throw new Error(`Couldn't find PR number for build ${buildkiteBuild.web_url}.`);
  }
  const flakyRunHistoryLink = `https://buildkite.com/elastic/${
    buildkiteBuild.pipeline.slug
  }/builds?branch=${encodeURIComponent(buildkiteBuild.branch)}`;

  const statusLine = getStatusLine({ success, setupFailed, noTestsRan });

  const prComment = `
## Flaky Test Runner Stats
### ${statusLine} - ${buildLink}
${testGroupResults.map(formatTestGroupResult).join('\n')}

[see run history](${flakyRunHistoryLink})
`;

  const githubClient = getGithubClient();
  const commentResult = await githubClient.issues.createComment({
    owner: 'elastic',
    repo: 'kibana',
    body: prComment,
    issue_number: prNumber,
  });

  console.log(`Comment added: ${commentResult.data.html_url}`);
}

function getStatusLine({
  success,
  setupFailed,
  noTestsRan,
}: {
  success: boolean;
  setupFailed: boolean;
  noTestsRan: boolean;
}): string {
  if (success) {
    return '🎉 All tests passed!';
  }
  if (setupFailed) {
    return '🔴 Setup failed — tests did not run.';
  }
  if (noTestsRan) {
    return '🔴 No tests ran.';
  }
  return '🟠 Some tests failed.';
}

function formatTestGroupResult(result: TestSuiteResult) {
  const statusIcon = result.success ? '✅' : '❌';
  const testName = result.name;
  const successCount = result.successCount;
  const groupSize = result.groupSize;

  return `[${statusIcon}] ${testName}: ${successCount}/${groupSize} tests passed.`;
}

function groupBy<T>(field: keyof T, values: T[]): Record<string, T[]> {
  return values.reduce((acc, value) => {
    const key = value[field];
    if (typeof key !== 'string') {
      throw new Error('Cannot group by non-string value field');
    }

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(value);
    return acc;
  }, {} as Record<string, T[]>);
}

function extractPRNumberFromBranch(branch: string | undefined) {
  if (!branch) {
    return null;
  } else {
    return branch.match(/refs\/pull\/(\d+)\/head/)?.[1];
  }
}

main()
  .then(() => {
    console.log('Flaky runner stats comment added to PR!');
  })
  .catch((e) => {
    // Best-effort: never fail the build on a reporting hiccup, and don't use
    // `soft_fail` (it would mask real failures from earlier steps).
    console.error('Failed to post flaky runner stats comment (non-fatal):', e);
  });
