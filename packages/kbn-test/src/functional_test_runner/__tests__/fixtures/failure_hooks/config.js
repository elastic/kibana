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

import { delay } from 'bluebird';

export default function () {
  return {
    testFiles: [
      require.resolve('./tests/before_hook'),
      require.resolve('./tests/it'),
      require.resolve('./tests/after_hook')
    ],
    services: {
      hookIntoLIfecycle({ getService }) {
        const log = getService('log');
        const lifecycle = getService('lifecycle')

        lifecycle.testFailure.add(async (err, test) => {
          log.info('testFailure %s %s', err.message, test.fullTitle());
          await delay(10);
          log.info('testFailureAfterDelay %s %s', err.message, test.fullTitle());
        });

        lifecycle.testHookFailure.add(async (err, test) => {
          log.info('testHookFailure %s %s', err.message, test.fullTitle());
          await delay(10);
          log.info('testHookFailureAfterDelay %s %s', err.message, test.fullTitle());
        });
      }
    },
    mochaReporter: {
      captureLogOutput: false
    }
  };
}
