/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const groups = /** @type {Array<{key: string, name: string, ciGroups: number }>} */ (
  require('./groups.json').groups
);

// TODO: remove this after https://github.com/elastic/kibana-operations/issues/15 is finalized
/** This function bridges the agent targeting between gobld and kibana-buildkite agent targeting */
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

for (const group of groups) {
  if (!group.ciGroups) {
    inputs.push(stepInput(group.key, group.name));
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
      agents: getAgentRule('n2-4'),
    },
  ],
};

console.log(JSON.stringify(pipeline, null, 2));
