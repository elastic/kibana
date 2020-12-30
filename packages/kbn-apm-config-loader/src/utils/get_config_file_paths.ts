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

import { resolve } from 'path';
// deep import to avoid loading the whole package
import { getConfigPath } from '@kbn/utils/target/path';
import { getArgValues } from './read_argv';

/**
 * Return the configuration files that needs to be loaded.
 *
 * This mimics the behavior of the `src/cli/serve/serve.js` cli script by reading
 * `-c` and `--config` options from process.argv, and fallbacks to `@kbn/utils`'s `getConfigPath()`
 */
export const getConfigurationFilePaths = (argv: string[]): string[] => {
  const rawPaths = getArgValues(argv, ['-c', '--config']);
  if (rawPaths.length) {
    return rawPaths.map((path) => resolve(process.cwd(), path));
  }
  return [getConfigPath()];
};
