/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const { resolve } = require('path');
const { REPO_ROOT } = require('@kbn/utils');

module.exports = {
  reporters: [
    'default',
    [
      `${REPO_ROOT}/packages/kbn-test/target/jest/junit_reporter`,
      {
        reportName: 'JUnit Reporter Integration Test',
        rootDirectory: resolve(
          REPO_ROOT,
          'packages/kbn-test/src/jest/integration_tests/__fixtures__'
        ),
      },
    ],
  ],
};
