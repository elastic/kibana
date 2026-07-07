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
import { expandAgentQueue, collectEnvFromLabels, getTrackedBranch } from '#pipeline-utils';

/**
 * Flaky runner JSON is passed on the Buildkite build via env vars set at trigger time (ci-stats UI,
 * `bk build create`, or internal CLIs). Both names carry the same JSON array; `_V1` is not a semver.
 *
 * - `KIBANA_FLAKY_TEST_RUNNER_CONFIG_V1` — preferred name for newer triggers (includes `command` entries).
 * - `KIBANA_FLAKY_TEST_RUNNER_CONFIG` — legacy alias; still accepted so older clients keep working.
 */
const configJson =
  process.env.KIBANA_FLAKY_TEST_RUNNER_CONFIG_V1 ?? process.env.KIBANA_FLAKY_TEST_RUNNER_CONFIG;
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
// 50 runs is enough to confirm a test is no longer flaky;
const MAX_COUNT_PER_CONFIG = 50;

// Scout discovery target for the flaky-setup step. We read the branch name
// from `package.json` (set when forking a release branch).
const scoutDiscoveryTarget = getTrackedBranch() === 'main' ? 'local' : 'local-stateful-only';

/**
 * Cypress group steps use `n2-4-virt` and a larger disk for `defend_workflows` suites. Command steps
 * inherit the same defaults unless `agentQueue` / `diskSizeGb` are set on the config entry.
 */
function defaultCypressFlakyAgentOptions(pathHint: string): {
  agentQueue: string;
  diskSizeGb?: number;
} {
  const defendWorkflows = pathHint.includes('defend_workflows');
  return {
    agentQueue: defendWorkflows ? 'n2-4-virt' : 'n2-4-spot',
    diskSizeGb: defendWorkflows ? 120 : undefined,
  };
}

interface GroupTestSuite {
  type: 'group';
  key: string;
  count: number;
}

interface FtrConfigTestSuite {
  type: 'ftrConfig';
  ftrConfig: string;
  count: number;
  /** Forwarded to FTR as FTR_EXTRA_ARGS (e.g. `--grep '…' --include path/to/test.ts`). */
  ftrExtraArgs?: string;
}

interface ScoutConfigTestSuite {
  type: 'scoutConfig';
  scoutConfig: string;
  count: number;
}

interface CommandTestSuite {
  type: 'command';
  label: string;
  workingDirectory: string;
  command: string;
  count: number;
  job?: string;
  /** Optional label for `upload_scout_cypress_events` (Scout/Cypress analytics). */
  scoutLabel?: string;
  agentQueue?: string;
  diskSizeGb?: number;
  /** Package path (repo-relative) where `yarn junit:merge` should run when it differs from `workingDirectory`. */
  junitMergeWorkingDirectory?: string;
}

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
    GroupTestSuite | FtrConfigTestSuite | ScoutConfigTestSuite | CommandTestSuite
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
    if (!['ftrConfig', 'scoutConfig', 'group', 'command'].includes(type)) {
      fail(`testSuite.type must be "ftrConfig", "scoutConfig", "group", or "command"`);
    }

    if (item.type === 'command') {
      const label = item.label;
      const workingDirectory = item.workingDirectory;
      const command = item.command;
      if (typeof label !== 'string' || label.length === 0) {
        fail(`testSuite.label must be a non-empty string for command entries`);
      }
      if (typeof workingDirectory !== 'string' || workingDirectory.length === 0) {
        fail(`testSuite.workingDirectory must be a non-empty string for command entries`);
      }
      if (typeof command !== 'string' || command.length === 0) {
        fail(`testSuite.command must be a non-empty string for command entries`);
      }
      if (count > MAX_COUNT_PER_CONFIG) {
        fail(
          `testSuite.count for command '${label}' is ${count}; ` +
            `max allowed is ${MAX_COUNT_PER_CONFIG}. Lower the count or split the run.`
        );
      }

      testSuites.push({
        type: 'command',
        label,
        workingDirectory,
        command,
        count,
        ...(typeof item.job === 'string' ? { job: item.job } : {}),
        ...(typeof item.scoutLabel === 'string' ? { scoutLabel: item.scoutLabel } : {}),
        ...(typeof item.agentQueue === 'string' ? { agentQueue: item.agentQueue } : {}),
        ...(typeof item.diskSizeGb === 'number' ? { diskSizeGb: item.diskSizeGb } : {}),
        ...(typeof item.junitMergeWorkingDirectory === 'string'
          ? { junitMergeWorkingDirectory: item.junitMergeWorkingDirectory }
          : {}),
      });
      continue;
    }

    if (item.type === 'ftrConfig') {
      const ftrConfig = item.ftrConfig;
      if (typeof ftrConfig !== 'string') {
        fail(`testSuite.ftrConfig must be a string`);
      }

      if (count > MAX_COUNT_PER_CONFIG) {
        fail(
          `testSuite.count for ftrConfig '${ftrConfig}' is ${count}; ` +
            `max allowed is ${MAX_COUNT_PER_CONFIG}. Lower the count or split the run.`
        );
      }

      if (item.ftrExtraArgs !== undefined && typeof item.ftrExtraArgs !== 'string') {
        fail(`testSuite.ftrExtraArgs must be a string for ftrConfig entries`);
      }

      testSuites.push({
        type: 'ftrConfig',
        ftrConfig,
        count,
        ...(typeof item.ftrExtraArgs === 'string' ? { ftrExtraArgs: item.ftrExtraArgs } : {}),
      });
      continue;
    }

    if (item.type === 'scoutConfig') {
      const scoutConfig = item.scoutConfig;
      if (typeof scoutConfig !== 'string') {
        fail(`testSuite.scoutConfig must be a string`);
      }

      if (count > MAX_COUNT_PER_CONFIG) {
        fail(
          `testSuite.count for scoutConfig '${scoutConfig}' is ${count}; ` +
            `max allowed is ${MAX_COUNT_PER_CONFIG}. ` +
            `Each Scout request fans out to one job per (arch x domain) mode, ` +
            `so high counts multiply quickly. Lower the count or split the run.`
        );
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

    if (count > MAX_COUNT_PER_CONFIG) {
      fail(
        `testSuite.count for group '${key}' is ${count}; ` +
          `max allowed is ${MAX_COUNT_PER_CONFIG}. Lower the count or split the run.`
      );
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
  // Single step that bootstraps Kibana, runs Scout config discovery, and dynamically
  // uploads one BK step per (scoutConfig x arch x domain) mode (parallelism: count).
  // Discovery requires a full `yarn kbn bootstrap`, which is too heavy to run inside
  // pipeline.ts itself; combining discovery + planning here avoids paying for an
  // extra agent boot and an artifact round-trip just to hand the manifest between
  // two otherwise-coupled steps.
  const scoutFlakyRequests = testSuites.filter(
    (t): t is ScoutConfigTestSuite => t.type === 'scoutConfig' && t.count > 0
  );

  // Tell the planner how many jobs are already committed by FTR/Cypress + fixed-overhead
  // steps, so it can refuse to fan out Scout into a build that would bust the platform's
  // 500-job cap. Mirrors the BASE_JOBS + non-Scout sum used in the pre-flight check above.
  const reservedJobsForPlanner =
    BASE_JOBS +
    testSuites.filter((t) => t.type !== 'scoutConfig').reduce((acc, t) => acc + t.count, 0);

  steps.push({
    command: '.buildkite/scripts/steps/test/scout/discover_and_plan_flaky.sh',
    label: 'Discover and plan Scout flaky steps',
    agents: expandAgentQueue('n2-4-spot'),
    key: 'scout_flaky_setup',
    timeout_in_minutes: 30,
    env: {
      SCOUT_FLAKY_REQUESTS: JSON.stringify(scoutFlakyRequests),
      SCOUT_FLAKY_CONCURRENCY: String(concurrency),
      SCOUT_FLAKY_CONCURRENCY_GROUP: process.env.UUID ?? '',
      SCOUT_FLAKY_RESERVED_JOBS: String(reservedJobsForPlanner),
      SCOUT_DISCOVERY_TARGET: scoutDiscoveryTarget,
    },
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

  switch (testSuite.type) {
    case 'ftrConfig':
      steps.push({
        command: `.buildkite/scripts/steps/test/ftr_configs.sh`,
        env: {
          FTR_CONFIG: testSuite.ftrConfig,
          ...(testSuite.ftrExtraArgs ? { FTR_EXTRA_ARGS: testSuite.ftrExtraArgs } : {}),
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
        retry: {
          automatic: [{ exit_status: '-1', limit: 3 }],
        },
      });
      break;

    case 'scoutConfig':
      // Scout entries are expanded into per-(arch, domain) BK steps by the
      // 'scout_flaky_setup' step above, which discovers configs and uploads the steps.
      break;

    case 'command': {
      const agentDefaults = defaultCypressFlakyAgentOptions(
        `${testSuite.workingDirectory}/${testSuite.command}`
      );
      const agentQueue = testSuite.agentQueue ?? agentDefaults.agentQueue;
      const diskSizeGb = testSuite.diskSizeGb ?? agentDefaults.diskSizeGb;
      steps.push({
        command: '.buildkite/scripts/steps/flaky/run_command.sh',
        label: testSuite.label,
        agents: expandAgentQueue(agentQueue, diskSizeGb),
        key: `${TestSuiteType.COMMAND}-${suiteIndex++}`,
        depends_on: 'build',
        timeout_in_minutes: 150,
        parallelism: testSuite.count,
        concurrency,
        concurrency_group: process.env.UUID,
        concurrency_method: 'eager',
        retry: {
          automatic: [{ exit_status: '-1', limit: 3 }],
        },
        env: {
          FLAKY_TEST_WORKING_DIRECTORY: testSuite.workingDirectory,
          FLAKY_TEST_COMMAND: testSuite.command,
          ...(testSuite.job ? { FLAKY_TEST_JOB: testSuite.job } : {}),
          ...(testSuite.scoutLabel ? { FLAKY_TEST_SCOUT_LABEL: testSuite.scoutLabel } : {}),
          ...(testSuite.junitMergeWorkingDirectory
            ? { FLAKY_TEST_JUNIT_MERGE_DIRECTORY: testSuite.junitMergeWorkingDirectory }
            : {}),
        },
      });
      break;
    }

    case 'group': {
      const [category, suiteName] = testSuite.key.split('/');
      switch (category) {
        case 'cypress':
          const group = groups.find((g) => g.key === testSuite.key);
          if (!group) {
            throw new Error(
              `Group configuration was not found in groups.json for the following cypress suite: {${suiteName}}.`
            );
          }
          const { agentQueue, diskSizeGb } = defaultCypressFlakyAgentOptions(suiteName);
          steps.push({
            command: `.buildkite/scripts/steps/functional/${suiteName}.sh`,
            label: group.name,
            agents: expandAgentQueue(agentQueue, diskSizeGb),
            key: `${TestSuiteType.CYPRESS}-${suiteIndex++}`,
            depends_on: 'build',
            timeout_in_minutes: 150,
            parallelism: testSuite.count,
            concurrency,
            concurrency_group: process.env.UUID,
            concurrency_method: 'eager',
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

        default:
          throw new Error(`unknown test suite: ${testSuite.key}`);
      }
      break;
    }

    default: {
      const exhaustiveCheck: never = testSuite;
      throw new Error(`unknown testSuite type: ${JSON.stringify(exhaustiveCheck)}`);
    }
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
