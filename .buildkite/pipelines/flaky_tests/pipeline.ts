/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { groups } from './groups.json';

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

  /** @type {Array<{ type: 'group', key: string; count: number } | { type: 'ftrConfig', ftrConfig: string; count: number }>} */
  const testSuites = [];
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) {
      fail(`testSuites must be objects`);
    }

    const count = item.count;
    if (typeof count !== 'number') {
      fail(`testSuite.count must be a number`);
    }

    const type = item.type;
    if (type !== 'ftrConfig' && type !== 'group') {
      fail(`testSuite.type must be either "ftrConfig" or "group"`);
    }

    if (item.type === 'ftrConfig') {
      const ftrConfig = item.ftrConfig;
      if (typeof ftrConfig !== 'string') {
        fail(`testSuite.ftrConfig must be a string`);
      }

      testSuites.push({
        ftrConfig,
        count,
      });
      continue;
    }

    const key = item.key;
    if (typeof key !== 'string') {
      fail(`testSuite.key must be a string`);
    }
    testSuites.push({
      key,
      count,
    });
  }

  return testSuites;
}

const testSuites = getTestSuitesFromJson(configJson);

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

const steps: any[] = [];
const pipeline = {
  env: {
    IGNORE_SHIP_CI_STATS_ERROR: 'true',
  },
  steps,
};

steps.push({
  command: '.buildkite/scripts/steps/build_kibana.sh',
  label: 'Build Kibana Distribution and Plugins',
  agents: { queue: 'c2-8' },
  key: 'build',
  if: "build.env('KIBANA_BUILD_ID') == null || build.env('KIBANA_BUILD_ID') == ''",
});

for (const testSuite of testSuites) {
  if (testSuite.count <= 0) {
    continue;
  }

  if (testSuite.ftrConfig) {
    steps.push({
      command: `.buildkite/scripts/steps/test/ftr_configs.sh`,
      env: {
        FTR_CONFIG: testSuite.ftrConfig,
      },
      label: `${testSuite.ftrConfig}`,
      parallelism: testSuite.count,
      concurrency,
      concurrency_group: process.env.UUID,
      concurrency_method: 'eager',
      agents: {
        queue: 'n2-4-spot-2',
      },
      depends_on: 'build',
      timeout_in_minutes: 150,
      retry: {
        automatic: [
          { exit_status: '-1', limit: 3 },
          // { exit_status: '*', limit: 1 },
        ],
      },
    });
    continue;
  }

  const keyParts = testSuite.key.split('/');
  switch (keyParts[0]) {
    case 'cypress':
      const CYPRESS_SUITE = keyParts[1];
      const group = groups.find((g) => g.key.includes(CYPRESS_SUITE));
      if (!group) {
        throw new Error(
          `Group configuration was not found in groups.json for the following cypress suite: {${CYPRESS_SUITE}}.`
        );
      }
      steps.push({
        command: `.buildkite/scripts/steps/functional/${CYPRESS_SUITE}.sh`,
        label: group.name,
        agents: { queue: 'n2-4-spot' },
        depends_on: 'build',
        parallelism: testSuite.count,
        concurrency,
        concurrency_group: process.env.UUID,
        concurrency_method: 'eager',
        env: {
          // disable split of test cases between parallel jobs when running them in flaky test runner
          // by setting chunks vars to value 1, which means all test will run in one job
          CLI_NUMBER: 1,
          CLI_COUNT: 1,
        },
      });
      break;
    default:
      throw new Error(`unknown test suite: ${testSuite.key}`);
  }
}

console.log(JSON.stringify(pipeline, null, 2));
