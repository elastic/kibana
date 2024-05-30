/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { execSync } = require('child_process');

const concurrency = 25;
const defaultCount = concurrency * 2;
const initialJobs = 3;

const getAgentRule = (queueName = 'n2-4-spot') => {
  if (
    process.env.BUILDKITE_AGENT_META_DATA_QUEUE === 'gobld' ||
    process.env.BUILDKITE_AGENT_META_DATA_PROVIDER === 'k8s'
  ) {
    const [kind, cores, addition] = queueName.split('-');
    const additionalProps =
      {
        spot: { preemptible: true },
        virt: { localSsdInterface: 'nvme', enableNestedVirtualization: true, localSsds: 1 },
      }[addition] || {};

    return {
      provider: 'gcp',
      image: 'family/kibana-ubuntu-2004',
      imageProject: 'elastic-images-prod',
      machineType: `${kind}-standard-${cores}`,
      ...additionalProps,
    };
  } else {
    return {
      queue: queueName,
    };
  }
};

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

  /** @type {Array<{ key: string, count: number }>} */
  const testSuites = [];
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) {
      fail(`testSuites must be objects`);
    }
    const key = item.key;
    if (typeof key !== 'string') {
      fail(`testSuite.key must be a string`);
    }
    const count = item.count;
    if (typeof count !== 'number') {
      fail(`testSuite.count must be a number`);
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
  steps: steps,
};

steps.push({
  command: '.buildkite/scripts/steps/build_kibana.sh',
  label: 'Build Kibana Distribution and Plugins',
  agents: getAgentRule('c2-8'),
  key: 'build',
  if: "build.env('KIBANA_BUILD_ID') == null || build.env('KIBANA_BUILD_ID') == ''",
});

let suiteIndex = 0;
for (const testSuite of testSuites) {
  const TEST_SUITE = testSuite.key;
  const RUN_COUNT = testSuite.count;
  const UUID = process.env.UUID;

  const JOB_PARTS = TEST_SUITE.split('/');
  const IS_XPACK = JOB_PARTS[0] === 'xpack';
  const TASK = JOB_PARTS[1];
  const CI_GROUP = JOB_PARTS.length > 2 ? JOB_PARTS[2] : '';

  if (RUN_COUNT < 1) {
    continue;
  }

  switch (TASK) {
    case 'cigroup':
      if (IS_XPACK) {
        steps.push({
          command: `CI_GROUP=${CI_GROUP} .buildkite/scripts/steps/functional/xpack_cigroup.sh`,
          label: `Default CI Group ${CI_GROUP}`,
          key: `test-group-${suiteIndex++}`,
          agents: getAgentRule('n2-4'),
          depends_on: 'build',
          parallelism: RUN_COUNT,
          concurrency: concurrency,
          concurrency_group: UUID,
          concurrency_method: 'eager',
        });
      } else {
        steps.push({
          command: `CI_GROUP=${CI_GROUP} .buildkite/scripts/steps/functional/oss_cigroup.sh`,
          label: `OSS CI Group ${CI_GROUP}`,
          key: `test-group-${suiteIndex++}`,
          agents: getAgentRule('n2-4-spot'),
          depends_on: 'build',
          parallelism: RUN_COUNT,
          concurrency: concurrency,
          concurrency_group: UUID,
          concurrency_method: 'eager',
        });
      }
      break;

    case 'firefox':
      steps.push({
        command: `.buildkite/scripts/steps/functional/${IS_XPACK ? 'xpack' : 'oss'}_firefox.sh`,
        label: `${IS_XPACK ? 'Default' : 'OSS'} Firefox`,
        key: `test-group-${suiteIndex++}`,
        agents: getAgentRule(IS_XPACK ? 'n2-4' : 'n2-4-spot'),
        depends_on: 'build',
        parallelism: RUN_COUNT,
        concurrency: concurrency,
        concurrency_group: UUID,
        concurrency_method: 'eager',
      });
      break;

    case 'accessibility':
      steps.push({
        command: `.buildkite/scripts/steps/functional/${
          IS_XPACK ? 'xpack' : 'oss'
        }_accessibility.sh`,
        label: `${IS_XPACK ? 'Default' : 'OSS'} Accessibility`,
        key: `test-group-${suiteIndex++}`,
        agents: getAgentRule(IS_XPACK ? 'n2-4' : 'n2-4-spot'),
        depends_on: 'build',
        parallelism: RUN_COUNT,
        concurrency: concurrency,
        concurrency_group: UUID,
        concurrency_method: 'eager',
      });
      break;
  }
}

pipeline.steps.push({
  wait: '~',
  continue_on_failure: true,
});

pipeline.steps.push({
  command: 'node .buildkite/pipelines/flaky_tests/post_stats_on_pr.js',
  label: 'Post results on Github pull request',
  agents: getAgentRule('n2-4-spot'),
  timeout_in_minutes: 15,
  retry: {
    automatic: [{ exit_status: '-1', limit: 3 }],
  },
  soft_fail: true,
});

console.log(JSON.stringify(pipeline, null, 2));
