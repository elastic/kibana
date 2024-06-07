/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { BuildkiteClient, getGithubClient } = require('kibana-buildkite-library');

async function main() {
  // Get buildkite build
  const buildkite = new BuildkiteClient();
  const buildkiteBuild = await buildkite.getBuild(
    process.env.BUILDKITE_PIPELINE_SLUG,
    process.env.BUILDKITE_BUILD_NUMBER
  );
  const buildLink = `[${buildkiteBuild.pipeline.slug}#${buildkiteBuild.number}](${buildkiteBuild.web_url})`;

  // Calculate success metrics
  const jobs = buildkiteBuild.jobs;
  const testSuiteRuns = jobs.filter((step) => {
    return step.step_key?.includes('test-group');
  });

  const testSuiteGroups = groupBy('name', testSuiteRuns);
  const success = testSuiteRuns.every((job) => job.state === 'passed');
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

  const prComment = `
## Flaky Test Runner Stats
### ${success ? '🎉 All tests passed!' : '🟠 Some tests failed.'} - ${buildLink}
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

function formatTestGroupResult(result) {
  const statusIcon = result.success ? '✅' : '❌';
  const testName = result.name;
  const successCount = result.successCount;
  const groupSize = result.groupSize;

  return `[${statusIcon}] ${testName}: ${successCount}/${groupSize} tests passed.`;
}

function groupBy(field, values) {
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
  }, {});
}

function extractPRNumberFromBranch(branch) {
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
    console.error(e);
    process.exit(1);
  });
