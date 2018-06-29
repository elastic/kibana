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

// Test helpers to simplify mocking environment options.

import { EnvOptions } from '../../env';

interface MockEnvOptions {
  config?: string;
  kbnServer?: any;
  mode?: EnvOptions['mode']['name'];
  packageInfo?: Partial<EnvOptions['packageInfo']>;
}

export function getEnvOptions({
  config,
  kbnServer,
  mode = 'development',
  packageInfo = {},
}: MockEnvOptions = {}): EnvOptions {
  return {
    config,
    kbnServer,
    mode: {
      dev: mode === 'development',
      name: mode,
      prod: mode === 'production',
    },
    packageInfo: {
      branch: 'some-branch',
      buildNum: 1,
      buildSha: 'some-sha-256',
      version: 'some-version',
      ...packageInfo,
    },
  };
}
