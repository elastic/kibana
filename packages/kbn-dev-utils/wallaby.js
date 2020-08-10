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

const path = require('path');
process.env.NODE_PATH = path.resolve(__dirname, '..', '..', 'node_modules');

module.exports = function (wallaby) {
  return {
    debug: true,
    files: ['./tsconfig.json', 'src/code_ownership/**/*.ts', '!**/*.test.ts'],

    // tests: ['**/*.test.ts', '**/*.test.tsx'],
    tests: ['src/code_ownership/__tests__/*.test.ts'],

    env: {
      type: 'node',
      runner: 'node',
    },
    testFramework: {
      type: 'jest',
    },
    compilers: {
      '**/*.ts?(x)': wallaby.compilers.typeScript({
        typescript: require('typescript'), // eslint-disable-line
      }),
      '**/*.js': wallaby.compilers.babel({
        babelrc: false,
        presets: [require.resolve('@kbn/babel-preset/node_preset')],
      }),
    },

    setup: (wallaby) => {
      const path = require('path');

      const kibanaDirectory = path.resolve(wallaby.localProjectDir, '..', '..');

      wallaby.testFramework.configure({
        rootDir: wallaby.localProjectDir,
        testURL: 'http://localhost',
        transform: {
          '^.+\\.js$': `${kibanaDirectory}/src/dev/jest/babel_transform.js`,
        },
      });
    },
  };
};
