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

import { copyAll } from '../lib';

export const CopySourceTask = {
  description: 'Copying source into platform-generic build directory',

  async run(config, log, build) {
    await copyAll(config.resolveFromRepo(), build.resolvePath(), {
      dot: false,
      select: [
        'yarn.lock',
        'src/**',
        '!src/**/*.{test,test.mocks,mock}.{js,ts,tsx}',
        '!src/**/mocks.ts', // special file who imports .mock files
        '!src/**/{__tests__,__snapshots__}/**',
        '!src/test_utils/**',
        '!src/fixtures/**',
        '!src/legacy/core_plugins/tests_bundle/**',
        '!src/legacy/core_plugins/testbed/**',
        '!src/legacy/core_plugins/console/public/tests/**',
        '!src/plugins/testbed/**',
        '!src/cli/cluster/**',
        '!src/cli/repl/**',
        '!src/es_archiver/**',
        '!src/functional_test_runner/**',
        '!src/dev/**',
        'bin/**',
        'typings/**',
        'webpackShims/**',
        'config/kibana.yml',
        'tsconfig*.json',
        'kibana.d.ts'
      ],
    });
  },
};
