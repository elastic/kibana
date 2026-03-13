/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: ['<rootDir>/src/platform/plugins/private/node_debugging_routes'],
  coverageDirectory:
    '<rootDir>/target/kibana-coverage/jest/src/platform/plugins/private/node_debugging_routes',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/src/platform/plugins/private/node_debugging_routes/server/**/*.{ts,tsx}',
  ],
};
