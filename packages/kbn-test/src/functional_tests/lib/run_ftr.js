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

import { createFunctionalTestRunner } from '../../../../../src/functional_test_runner';
import { CliError } from './run_cli';

export async function runFtr({
  configPath,
  options: { log, bail, grep, updateBaselines, suiteTags },
}) {
  const ftr = createFunctionalTestRunner({
    log,
    configFile: configPath,
    configOverrides: {
      mochaOpts: {
        bail: !!bail,
        grep,
      },
      updateBaselines,
      suiteTags,
    },
  });

  const failureCount = await ftr.run();
  if (failureCount > 0) {
    throw new CliError(
      `${failureCount} functional test ${failureCount === 1 ? 'failure' : 'failures'}`
    );
  }
}
