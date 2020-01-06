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

import { EnvOptions } from '../env';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer R> ? Array<DeepPartial<R>> : DeepPartial<T[P]>;
};

export function getEnvOptions(options: DeepPartial<EnvOptions> = {}): EnvOptions {
  return {
    configs: options.configs || [],
    cliArgs: {
      dev: true,
      open: false,
      quiet: false,
      silent: false,
      watch: false,
      repl: false,
      basePath: false,
      optimize: false,
      oss: false,
      runExamples: false,
      ...(options.cliArgs || {}),
    },
    isDevClusterMaster:
      options.isDevClusterMaster !== undefined ? options.isDevClusterMaster : false,
  };
}
