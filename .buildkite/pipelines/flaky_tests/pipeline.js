const stepInput = (key, nameOfSuite) => {
  return {
    key: `ftsr-suite/${key}`,
    text: nameOfSuite,
    required: false,
    default: '0',
  };
};

const OSS_CI_GROUPS = 12;
const XPACK_CI_GROUPS = 27;

const inputs = [
  {
    key: 'ftsr-override-count',
    text: 'Override for all suites',
    default: 0,
    required: true,
  },
];

for (let i = 1; i <= OSS_CI_GROUPS; i++) {
  inputs.push(stepInput(`oss/cigroup/${i}`, `OSS CI Group ${i}`));
}

inputs.push(stepInput(`oss/firefox`, 'OSS Firefox'));
inputs.push(stepInput(`oss/accessibility`, 'OSS Accessibility'));

for (let i = 1; i <= XPACK_CI_GROUPS; i++) {
  inputs.push(stepInput(`xpack/cigroup/${i}`, `Default CI Group ${i}`));
}

inputs.push(stepInput(`xpack/cigroup/Docker`, 'Default CI Group Docker'));
inputs.push(stepInput(`xpack/firefox`, 'Default Firefox'));
inputs.push(stepInput(`xpack/accessibility`, 'Default Accessibility'));

const pipeline = {
  steps: [
    {
      input: 'Number of Runs - Click Me',
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
