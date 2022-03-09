/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const groups =
  /** @type {Array<{key: string, name: string, ciGroups: number | Array<string> }>} */ (
    require('./groups.json').groups
  );

const stepInput = (key, nameOfSuite) => {
  return {
    key: `ftsr-suite/${key}`,
    text: nameOfSuite,
    required: false,
    default: '0',
  };
};

const inputs = [
  {
    key: 'ftsr-override-count',
    text: 'Override for all suites',
    default: '0',
    required: true,
  },
];

const cypressSuites = ['security_solution', 'osquery_cypress', 'fleet_cypress'];

for (const group of groups) {
  if (!group.ciGroups) {
    inputs.push(stepInput(group.key, group.name));
  } else if (group.key === 'xpack/cypress') {
    for (let i = 1; i <= group.ciGroups; i++) {
      const testSuite = cypressSuites[i];
      inputs.push(stepInput(`${group.key}/${testSuite}`, `${group.name} ${testSuite}`));
    }
  } else {
    for (let i = 1; i <= group.ciGroups; i++) {
      inputs.push(stepInput(`${group.key}/${i}`, `${group.name} ${i}`));
    }
  }
}

const pipeline = {
  steps: [
    {
      input: 'Number of Runs - Click Me',
      fields: inputs,
      if: `build.env('KIBANA_FLAKY_TEST_RUNNER_CONFIG') == null`,
    },
    {
      wait: '~',
    },
    {
      command: '.buildkite/pipelines/flaky_tests/runner.sh',
      label: 'Create pipeline',
      agents: {
        queue: 'kibana-default',
      },
    },
  ],
};

console.log(JSON.stringify(pipeline, null, 2));
