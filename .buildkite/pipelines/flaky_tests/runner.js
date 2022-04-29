/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { execSync } = require('child_process');
const groups = /** @type {Array<{key: string, name: string, ciGroups: number }>} */ (
  require('./groups.json').groups
);

const concurrency = 25;
const defaultCount = concurrency * 2;
const initialJobs = 3;

function getTestSuitesFromMetadata() {
  const keys = execSync('buildkite-agent meta-data keys')
    .toString()
    .split('\n')
    .filter((k) => k.startsWith('ftsr-suite/'));

  const overrideCount = execSync(`buildkite-agent meta-data get 'ftsr-override-count'`)
    .toString()
    .trim();

  const testSuites = [];
  for (const key of keys) {
    if (!key) {
      continue;
    }

    const value =
      overrideCount && overrideCount !== '0'
        ? overrideCount
        : execSync(`buildkite-agent meta-data get '${key}'`).toString().trim();

    const count = value === '' ? defaultCount : parseInt(value);
    testSuites.push({
      key: key.replace('ftsr-suite/', ''),
      count: count,
    });
  }

  return testSuites;
}

function getTestSuitesFromJson(json) {
  const fail = (errorMsg) => {
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

const testSuites = process.env.KIBANA_FLAKY_TEST_RUNNER_CONFIG
  ? getTestSuitesFromJson(process.env.KIBANA_FLAKY_TEST_RUNNER_CONFIG)
  : getTestSuitesFromMetadata();

const totalJobs = testSuites.reduce((acc, t) => acc + t.count, initialJobs);

if (totalJobs > 500) {
  console.error('+++ Too many tests');
  console.error(
    `Buildkite builds can only contain 500 steps in total. Found ${totalJobs} in total. Make sure your test runs are less than ${
      500 - initialJobs
    }`
  );
  process.exit(1);
}

const steps = [];
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
  if (testSuite.ftrConfig) {
    if (testSuite.count > 0) {
      steps.push({
        command: `.buildkite/scripts/steps/test/ftr_configs.sh`,
        env: {
          FTR_CONFIG: testSuite.ftrConfig,
        },
        label: `FTR Config: ${testSuite.ftrConfig}`,
        parallelism: testSuite.count,
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
    }
    continue;
  }

  if (testSuite.count <= 0) {
    continue;
  }

  const keyParts = testSuite.key.split('/');
  switch (keyParts[0]) {
    case 'cypress':
      const CYPRESS_SUITE = keyParts[1];
      const group = groups.find((group) => group.key.includes(CYPRESS_SUITE));
      if (!group) {
        throw new Error(
          `Group configuration was not found in groups.json for the following cypress suite: {${CYPRESS_SUITE}}.`
        );
      }
      steps.push({
        command: `.buildkite/scripts/steps/functional/${CYPRESS_SUITE}.sh`,
        label: group.name,
        agents: { queue: 'ci-group-6' },
        depends_on: 'build',
        parallelism: testSuite.count,
        concurrency: concurrency,
        concurrency_group: process.env.UUID,
        concurrency_method: 'eager',
      });
      break;
    default:
      throw new Error(`unknown test suite: ${testSuite.key}`);
  }
}

console.log(JSON.stringify(pipeline, null, 2));
