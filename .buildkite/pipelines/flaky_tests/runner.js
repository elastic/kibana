const { execSync } = require('child_process');

const keys = execSync('buildkite-agent meta-data keys')
  .toString()
  .split('\n')
  .filter((k) => k.startsWith('ftsr-suite/'));

const overrideCount = parseInt(
  execSync(`buildkite-agent meta-data get 'ftsr-override-count'`).toString().trim()
);

const concurrency = 25;
const initialJobs = 3;

let totalJobs = initialJobs;

const testSuites = [];
for (const key of keys) {
  if (!key) {
    continue;
  }

  const value =
    overrideCount || execSync(`buildkite-agent meta-data get '${key}'`).toString().trim();

  const count = value === '' ? defaultCount : parseInt(value);
  totalJobs += count;

  testSuites.push({
    key: key.replace('ftsr-suite/', ''),
    count: count,
  });
}

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
  agents: { queue: 'c2-8' },
  key: 'build',
  if: "build.env('BUILD_ID_FOR_ARTIFACTS') == null || build.env('BUILD_ID_FOR_ARTIFACTS') == ''",
});

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
          agents: { queue: 'ci-group-6' },
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
          agents: { queue: 'ci-group-4d' },
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
        agents: { queue: IS_XPACK ? 'ci-group-6' : 'ci-group-4d' },
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
        agents: { queue: IS_XPACK ? 'ci-group-6' : 'ci-group-4d' },
        depends_on: 'build',
        parallelism: RUN_COUNT,
        concurrency: concurrency,
        concurrency_group: UUID,
        concurrency_method: 'eager',
      });
      break;
  }
}

console.log(JSON.stringify(pipeline, null, 2));
