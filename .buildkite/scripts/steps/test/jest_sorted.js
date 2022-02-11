/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { execSync } = require('child_process');

const PARALLEL_COUNT = process.env.BUILDKITE_PARALLEL_JOB_COUNT
  ? parseInt(process.env.BUILDKITE_PARALLEL_JOB_COUNT, 10)
  : 1;

const slowSuites = {
  'src/core/jest.config.js': 6,
  'src/plugins/discover/jest.config.js': 6,
  'src/plugins/data/jest.config.js': 6,
  'x-pack/plugins/apm/jest.config.js': 10,
  'x-pack/plugins/canvas/jest.config.js': 5,
  'x-pack/plugins/cases/jest.config.js': 11,
  'x-pack/plugins/enterprise_search/jest.config.js': 26,
  'x-pack/plugins/lens/jest.config.js': 7,
  'x-pack/plugins/maps/jest.config.js': 5,
  'x-pack/plugins/ml/jest.config.js': 6,
  'x-pack/plugins/monitoring/jest.config.js': 5,
  'x-pack/plugins/observability/jest.config.js': 5,
  'x-pack/plugins/security_solution/public/common/jest.config.js': 17,
  'x-pack/plugins/security_solution/public/detections/jest.config.js': 11,
  'x-pack/plugins/security_solution/public/management/jest.config.js': 8,
  'x-pack/plugins/security_solution/public/network/jest.config.js': 5,
  'x-pack/plugins/security_solution/public/overview/jest.config.js': 5,
  'x-pack/plugins/security_solution/public/timelines/jest.config.js': 20,
  'x-pack/plugins/security_solution/server/lib/jest.config.js': 5,
  'x-pack/plugins/security/jest.config.js': 10,
  'x-pack/plugins/triggers_actions_ui/jest.config.js': 6,
  'x-pack/plugins/uptime/jest.config.js': 12,
};

const configs = execSync(
  'find src x-pack packages -name jest.config.js -not -path "*/__fixtures__/*" | sort'
)
  .toString()
  .split('\n')
  .filter((t) => t);

configs.sort((a, b) => {
  const aTime = slowSuites[a] || 0;
  const bTime = slowSuites[b] || 0;

  if (aTime || bTime) {
    return bTime - aTime;
  }

  // After slow suites, sort alphabetically
  return a.localeCompare(b);
});

// After the first PARALLEL_COUNT, reverse the order of the next PARALLEL_COUNT, to pair the shortest suites with the longest ones
const configsFinal = [
  ...configs.slice(0, PARALLEL_COUNT),
  ...configs.slice(PARALLEL_COUNT, PARALLEL_COUNT * 2).reverse(),
  ...configs.slice(PARALLEL_COUNT * 2),
];

for (const config of configsFinal) {
  console.log(config);
}
