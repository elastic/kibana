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

import { read } from '../lib';

export const UuidVerificationTask = {
  description: 'Verify that no UUID file is baked into the build',

  async run(config, log, build) {
    const uuidFilePath = build.resolvePath('data', 'uuid');
    await read(uuidFilePath).then(
      function success() {
        throw new Error(`UUID file should not exist at [${uuidFilePath}]`);
      },
      function error(err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    );
  },
};
