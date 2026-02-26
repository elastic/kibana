/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { groups } from './groups.json';
import { TestSuiteType } from './constants';
import type { BuildkiteStep } from '#pipeline-utils';
import { expandAgentQueue, collectEnvFromLabels } from '#pipeline-utils';

const configJson = process.env.KIBANA_FLAKY_TEST_RUNNER_CONFIG;
if (!configJson) {
  console.error('+++ Triggering directly is not supported anymore');
  console.error(
    `Please use the "Trigger Flaky Test Runner" UI to run the Flaky Test Runner. You can find the UI at the URL below:`
  );
  console.error('\n    https://ci-stats.kibana.dev/trigger_flaky_test_runner\n');
  process.exit(1);
}

const concurrency = process.env.KIBANA_FLAKY_TEST_CONCURRENCY
  ? parseInt(process.env.KIBANA_FLAKY_TEST_CONCURRENCY, 10)
  : 25;

if (Number.isNaN(concurrency)) {
  throw new Error(
    `invalid KIBANA_FLAKY_TEST_CONCURRENCY: ${process.env.KIBANA_FLAKY_TEST_CONCURRENCY}`
  );
}

const BASE_JOBS = 1;
const MAX_JOBS = 500;

function getTestSuitesFromJson(json: string) {
  const fail = (errorMsg: string) => {
    console.error('+++ Invalid test config provided');
    console.error(`${errorMsg}: ${json}`);
    process.exit(1);
  };

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    fail(`JSON test config did not parse correctly`);
  }

  if (!Array.isArray(parsed)) {
    fail(`JSON test config must be an array`);
  }

  const testSuites: Array<
    | { type: 'group'; key: string; count: number }
    | { type: 'ftrConfig'; ftrConfig: string; count: number }
    | { type: 'scoutConfig'; scoutConfig: string; count: number }
  > = [];
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) {
      fail(`testSuites must be objects`);
    }

    const count = item.count;
    if (typeof count !== 'number') {
      fail(`testSuite.count must be a number`);
    }

    const type = item.type;
    if (type !== 'ftrConfig' && type !== 'scoutConfig' && type !== 'group') {
      fail(`testSuite.type must be either "ftrConfig" or "scoutConfig" or "group"`);
    }

    if (item.type === 'ftrConfig') {
      const ftrConfig = item.ftrConfig;
      if (typeof ftrConfig !== 'string') {
        fail(`testSuite.ftrConfig must be a string`);
      }

      testSuites.push({
        type: 'ftrConfig',
        ftrConfig,
        count,
      });
      continue;
    }

    if (item.type === 'scoutConfig') {
      const scoutConfig = item.scoutConfig;
      if (typeof scoutConfig !== 'string') {
        fail(`testSuite.scoutConfig must be a string`);
      }

      testSuites.push({
        type: 'scoutConfig',
        scoutConfig,
        count,
      });
      continue;
    }

    const key = item.key;
    if (typeof key !== 'string') {
      fail(`testSuite.key must be a string`);
    }
    testSuites.push({
      type: 'group',
      key,
      count,
    });
  }

  return testSuites;
}

const testSuites = getTestSuitesFromJson(configJson);
const hasScoutSuites = testSuites.some((t) => t.type === 'scoutConfig' && t.count > 0);

const totalJobs = testSuites.reduce((acc, t) => acc + t.count, BASE_JOBS);

if (totalJobs > MAX_JOBS) {
  console.error('+++ Too many tests');
  console.error(
    `Buildkite builds can only contain ${MAX_JOBS} jobs in total. Found ${totalJobs} based on this config. Make sure your test runs are less than ${
      MAX_JOBS - BASE_JOBS
    }`
  );
  process.exit(1);
}

const steps: BuildkiteStep[] = [];
const envFromLabels = collectEnvFromLabels(process.env.GITHUB_PR_LABELS);
const pipeline = {
  env: {
    IGNORE_SHIP_CI_STATS_ERROR: 'true',
    ...envFromLabels,
  },
  steps,
};

steps.push({
  command: '.buildkite/scripts/steps/build_kibana.sh',
  label: 'Build Kibana Distribution',
  agents: expandAgentQueue('c2-8'),
  key: 'build',
  if: "build.env('KIBANA_BUILD_ID') == null || build.env('KIBANA_BUILD_ID') == ''",
});

if (hasScoutSuites) {
  steps.push({
    command: '.buildkite/scripts/steps/test/scout/discover_playwright_configs.sh',
    label: 'Discover Scout Playwright configs',
    agents: expandAgentQueue('n2-4-spot'),
    key: 'scout_playwright_configs',
    timeout_in_minutes: 30,
    retry: {
      automatic: [{ exit_status: '-1', limit: 3 }],
    },
  });
}

let suiteIndex = 0;
for (const testSuite of testSuites) {
  if (testSuite.count <= 0) {
    continue;
  }

  if (testSuite.type === 'ftrConfig') {
    steps.push({
      command: `.buildkite/scripts/steps/test/ftr_configs.sh`,
      env: {
        FTR_CONFIG: testSuite.ftrConfig,
      },
      key: `${TestSuiteType.FTR}-${suiteIndex++}`,
      label: `${testSuite.ftrConfig}`,
      parallelism: testSuite.count,
      concurrency,
      concurrency_group: process.env.UUID,
      concurrency_method: 'eager',
      agents: expandAgentQueue('n2-4-spot'),
      depends_on: 'build',
      timeout_in_minutes: 150,
      cancel_on_build_failing: true,
      retry: {
        automatic: [{ exit_status: '-1', limit: 3 }],
      },
    });
    continue;
  }

  if (testSuite.type === 'scoutConfig') {
    const usesParallelWorkers = testSuite.scoutConfig.endsWith('parallel.playwright.config.ts');

    steps.push({
      command: `.buildkite/scripts/steps/test/scout/flaky_configs.sh`,
      env: {
        SCOUT_CONFIG: testSuite.scoutConfig,
        SCOUT_REPORTER_ENABLED: 'true',
      },
      key: `${TestSuiteType.SCOUT}-${suiteIndex++}`,
      label: `${testSuite.scoutConfig}`,
      parallelism: testSuite.count,
      concurrency,
      concurrency_group: process.env.UUID,
      concurrency_method: 'eager',
      agents: expandAgentQueue(usesParallelWorkers ? 'n2-8-spot' : 'n2-4-spot'),
      depends_on: hasScoutSuites ? ['build', 'scout_playwright_configs'] : 'build',
      timeout_in_minutes: 60,
      cancel_on_build_failing: true,
      retry: {
        automatic: [{ exit_status: '-1', limit: 3 }],
      },
    });
    continue;
  }

  const [category, suiteName] = testSuite.key.split('/');
  switch (category) {
    case 'cypress':
      const group = groups.find((g) => g.key === testSuite.key);
      if (!group) {
        throw new Error(
          `Group configuration was not found in groups.json for the following cypress suite: {${suiteName}}.`
        );
      }
      const agentQueue = suiteName.includes('defend_workflows') ? 'n2-4-virt' : 'n2-4-spot';
      steps.push({
        command: `.buildkite/scripts/steps/functional/${suiteName}.sh`,
        label: group.name,
        agents: expandAgentQueue(agentQueue),
        key: `${TestSuiteType.CYPRESS}-${suiteIndex++}`,
        depends_on: 'build',
        timeout_in_minutes: 150,
        parallelism: testSuite.count,
        concurrency,
        concurrency_group: process.env.UUID,
        concurrency_method: 'eager',
        cancel_on_build_failing: true,
        retry: {
          automatic: [{ exit_status: '-1', limit: 3 }],
        },
        env: {
          // disable split of test cases between parallel jobs when running them in flaky test runner
          // by setting chunks vars to value 1, which means all test will run in one job
          CLI_NUMBER: 1,
          CLI_COUNT: 1,
          // The security solution cypress tests don't recognize CLI_NUMBER and CLI_COUNT, they use `BUILDKITE_PARALLEL_JOB_COUNT` and `BUILDKITE_PARALLEL_JOB`, which cannot be overridden here.
          // Use `RUN_ALL_TESTS` to make Security Solution Cypress tests run all tests instead of a subset.
          RUN_ALL_TESTS: 'true',
        },
      });
      break;
    case 'elastic_synthetics':
      const synthGroup = groups.find((g) => g.key === testSuite.key);
      if (!synthGroup) {
        throw new Error(
          `Group configuration was not found in groups.json for the following synthetics suite: {${suiteName}}.`
        );
      }
      steps.push({
        command: `.buildkite/scripts/steps/functional/${suiteName}.sh`,
        label: synthGroup.name,
        agents: expandAgentQueue('n2-4-spot'),
        key: `${TestSuiteType.SYNTHETICS}-${suiteIndex++}`,
        depends_on: 'build',
        timeout_in_minutes: 30,
        parallelism: testSuite.count,
        concurrency,
        concurrency_group: process.env.UUID,
        concurrency_method: 'eager',
        cancel_on_build_failing: true,
        retry: {
          automatic: [{ exit_status: '-1', limit: 3 }],
        },
      });
      break;

    default:
      throw new Error(`unknown test suite: ${testSuite.key}`);
  }
}

pipeline.steps.push({
  wait: '~',
  continue_on_failure: true,
});

pipeline.steps.push({
  command: 'ts-node .buildkite/pipelines/flaky_tests/post_stats_on_pr.ts',
  label: 'Post results on Github pull request',
  agents: expandAgentQueue('n2-4-spot'),
  timeout_in_minutes: 15,
  retry: {
    automatic: [{ exit_status: '-1', limit: 3 }],
  },
  soft_fail: true,
});

console.log(JSON.stringify(pipeline, null, 2));
