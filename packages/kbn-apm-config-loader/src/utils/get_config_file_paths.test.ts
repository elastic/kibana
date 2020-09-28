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

import { resolve, join } from 'path';
import { getConfigPath } from '@kbn/utils';
import { getConfigurationFilePaths } from './get_config_file_paths';

describe('getConfigurationFilePaths', () => {
  const cwd = process.cwd();

  it('retrieve the config file paths from the command line arguments', () => {
    const argv = ['--config', './relative-path', '-c', '/absolute-path'];

    expect(getConfigurationFilePaths(argv)).toEqual([
      resolve(cwd, join('.', 'relative-path')),
      '/absolute-path',
    ]);
  });

  it('fallbacks to `getConfigPath` value', () => {
    expect(getConfigurationFilePaths([])).toEqual([getConfigPath()]);
  });
});
