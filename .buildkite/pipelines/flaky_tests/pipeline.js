const stepInput = (key, nameOfSuite) => {
  return {
    key: `ftsr-suite/${key}`,
    text: nameOfSuite,
    required: false,
    default: '0',
  };
};

const OSS_CI_GROUPS = 12;
const XPACK_CI_GROUPS = 13;

const inputs = [
  {
    key: 'ftsr-override-count',
    text: 'Override for all suites',
    default: 0,
    required: true,
  },
  {
    key: 'ftsr-concurrency',
    text: 'Max concurrency per step',
    default: 20,
    required: true,
  },
];

for (let i = 1; i <= OSS_CI_GROUPS; i++) {
  inputs.push(stepInput(`oss/cigroup/${i}`, `OSS CI Group ${i}`));
}

for (let i = 1; i <= XPACK_CI_GROUPS; i++) {
  inputs.push(stepInput(`xpack/cigroup/${i}`, `Default CI Group ${i}`));
}

const pipeline = {
  steps: [
    {
      input: 'Number of Runs',
      fields: inputs,
    },
    {
      wait: '~',
    },
    {
      command: '.buildkite/pipelines/flaky_tests/runner.sh',
      label: 'Create pipeline',
    },
  ],
};

console.log(JSON.stringify(pipeline, null, 2));
