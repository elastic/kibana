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

import { relative, resolve } from 'path';
import { getConfigFromFiles } from './read_config';

const fixtureFile = (name: string) => `${__dirname}/__fixtures__/${name}`;

test('reads single yaml from file system and parses to json', () => {
  const config = getConfigFromFiles([fixtureFile('config.yml')]);

  expect(config).toMatchSnapshot();
});

test('returns a deep object', () => {
  const config = getConfigFromFiles([fixtureFile('/config_flat.yml')]);

  expect(config).toMatchSnapshot();
});

test('reads and merges multiple yaml files from file system and parses to json', () => {
  const config = getConfigFromFiles([fixtureFile('/one.yml'), fixtureFile('/two.yml')]);

  expect(config).toMatchSnapshot();
});

test('should inject an environment variable value when setting a value with ${ENV_VAR}', () => {
  process.env.KBN_ENV_VAR1 = 'val1';
  process.env.KBN_ENV_VAR2 = 'val2';

  const config = getConfigFromFiles([fixtureFile('/en_var_ref_config.yml')]);

  delete process.env.KBN_ENV_VAR1;
  delete process.env.KBN_ENV_VAR2;

  expect(config).toMatchSnapshot();
});

test('should throw an exception when referenced environment variable in a config value does not exist', () => {
  expect(() =>
    getConfigFromFiles([fixtureFile('/en_var_ref_config.yml')])
  ).toThrowErrorMatchingSnapshot();
});

describe('different cwd()', () => {
  const originalCwd = process.cwd();
  const tempCwd = resolve(__dirname);

  beforeAll(() => process.chdir(tempCwd));
  afterAll(() => process.chdir(originalCwd));

  test('resolves relative files based on the cwd', () => {
    const relativePath = relative(tempCwd, fixtureFile('/one.yml'));
    const config = getConfigFromFiles([relativePath]);

    expect(config).toMatchSnapshot();
  });

  test('fails to load relative paths, not found because of the cwd', () => {
    const relativePath = relative(resolve(__dirname, '../../'), fixtureFile('/one.yml'));
    expect(() => getConfigFromFiles([relativePath])).toThrowError(/ENOENT/);
  });
});
