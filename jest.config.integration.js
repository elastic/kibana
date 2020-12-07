/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const preset = require('@kbn/test/jest-preset');

module.exports = {
  preset: '@kbn/test',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/packages'],
  testMatch: ['**/integration_tests**/*.test.{js,mjs,ts,tsx}'],
  testRunner: 'jasmine2',
  testPathIgnorePatterns: preset.testPathIgnorePatterns.filter(
    (pattern) => !pattern.includes('integration_tests')
  ),
  reporters: [
    'default',
    [
      '<rootDir>/packages/kbn-test/target/jest/junit_reporter',
      { reportName: 'Jest Integration Tests' },
    ],
  ],
  setupFilesAfterEnv: ['<rootDir>/packages/kbn-test/target/jest/setup/after_env.integration.js'],
};
