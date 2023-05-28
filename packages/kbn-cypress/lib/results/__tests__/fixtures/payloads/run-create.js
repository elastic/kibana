/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const createRun = {
  ci: { params: null, provider: null },
  specs: [
    'cypress/integration/1000.spec.js',
    'cypress/integration/crash.spec.js',
    'cypress/integration/fails.spec.js',
    'cypress/integration/flaky.spec.js',
    'cypress/integration/notests.spec.js',
    'cypress/integration/orchestration_105.spec.js',
    'cypress/integration/orchestration_106.spec.js',
    'cypress/integration/retries.spec.js',
    'cypress/integration/skipped.spec.js',
  ],
  commit: {
    sha: '1a5a4b30a6d7ee7cf03b6c804666e3e87eae2811',
    branch: 'main',
    authorName: 'John Doe',
    authorEmail: 'john@doe.org',
    message: 'cy2 3.4.1\n',
    remoteOrigin: 'https://github.com/currents-dev/dashboard.git',
    defaultBranch: null,
  },
  group: null,
  platform: {
    osCpus: [
      [Object],
      [Object],
      [Object],
      [Object],
      [Object],
      [Object],
      [Object],
      [Object],
      [Object],
      [Object],
    ],
    osName: 'darwin',
    osMemory: { free: 131694592, total: 34359738368 },
    osVersion: '22.1.0',
    browserName: 'Electron',
    browserVersion: '106.0.5249.51',
  },
  parallel: true,
  ciBuildId: '1670743506',
  projectId: 'IjH22B',
  recordKey: 'pJwuAratQmk5DXSo',
  specPattern: 'cypress/integration/*.spec.js',
  tags: [''],
  testingType: 'e2e',
  runnerCapabilities: { dynamicSpecsInSerialMode: true, skipSpecAction: true },
};
