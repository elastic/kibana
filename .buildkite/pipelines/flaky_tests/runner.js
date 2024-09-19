const { execSync } = require('child_process');

const keys = execSync('buildkite-agent meta-data keys')
  .toString()
  .split('\n')
  .filter((k) => k.startsWith('ftsr-suite/'));

const overrideCount = parseInt(
  execSync(`buildkite-agent meta-data get 'ftsr-override-count'`).toString().trim()
);

const concurrency =
  parseInt(execSync(`buildkite-agent meta-data get 'ftsr-concurrency'`).toString().trim()) || 20;

const testSuites = [];
for (const key of keys) {
  if (!key) {
    continue;
  }

  const value =
    overrideCount || execSync(`buildkite-agent meta-data get '${key}'`).toString().trim();

  testSuites.push({
    key: key.replace('ftsr-suite/', ''),
    count: value === '' ? defaultCount : parseInt(value),
  });
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
  agents: { queue: 'c2-8' },
  key: 'build',
  if: "build.env('BUILD_ID_FOR_ARTIFACTS') == null || build.env('BUILD_ID_FOR_ARTIFACTS') == ''",
});

for (const testSuite of testSuites) {
  const TEST_SUITE = testSuite.key;
  const RUN_COUNT = testSuite.count;
  const UUID = TEST_SUITE + process.env.UUID;

  const JOB_PARTS = TEST_SUITE.split('/');
  const IS_XPACK = JOB_PARTS[0] === 'xpack';
  const CI_GROUP = JOB_PARTS.length > 2 ? JOB_PARTS[2] : '';

  if (RUN_COUNT < 1) {
    continue;
  }

  if (IS_XPACK) {
    steps.push({
      command: `CI_GROUP=${CI_GROUP} .buildkite/scripts/steps/functional/xpack_cigroup.sh`,
      label: `Default CI Group ${CI_GROUP}`,
      agents: { queue: 'ci-group-6' },
      depends_on: 'build',
      parallelism: RUN_COUNT,
      concurrency: concurrency,
      concurrency_group: UUID,
    });
  } else {
    steps.push({
      command: `CI_GROUP=${CI_GROUP} .buildkite/scripts/steps/functional/oss_cigroup.sh`,
      label: `OSS CI Group ${CI_GROUP}`,
      agents: { queue: 'ci-group-4d' },
      depends_on: 'build',
      parallelism: RUN_COUNT,
      concurrency: concurrency,
      concurrency_group: UUID,
    });
  }
}

console.log(JSON.stringify(pipeline, null, 2));
