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
import { readYamlConfig } from './read_yaml_config';

function fixture(name) {
  return resolve(__dirname, '__fixtures__', name);
}

describe('cli/serve/read_yaml_config', function () {
  it('reads a single config file', function () {
    const config = readYamlConfig(fixture('one.yml'));

    expect(config).toEqual({
      foo: 1,
      bar: true,
    });
  });

  it('reads and merged multiple config file', function () {
    const config = readYamlConfig([
      fixture('one.yml'),
      fixture('two.yml')
    ]);

    expect(config).toEqual({
      foo: 2,
      bar: true,
      baz: 'bonkers'
    });
  });

  it('should inject an environment variable value when setting a value with ${ENV_VAR}', function () {
    process.env.KBN_ENV_VAR1 = 'val1';
    process.env.KBN_ENV_VAR2 = 'val2';
    const config = readYamlConfig([ fixture('en_var_ref_config.yml') ]);

    expect(config).toEqual({
      foo: 1,
      bar: 'pre-val1-mid-val2-post',
      elasticsearch: {
        requestHeadersWhitelist: ['val1', 'val2']
      }
    });
  });

  it('should thow an exception when referenced environment variable in a config value does not exist', function () {
    expect(function () {
      readYamlConfig([ fixture('invalid_en_var_ref_config.yml') ]);
    }).toThrow();
  });

  describe('different cwd()', function () {
    const originalCwd = process.cwd();
    const tempCwd = resolve(__dirname);

    beforeAll(() => process.chdir(tempCwd));
    afterAll(() => process.chdir(originalCwd));

    it('resolves relative files based on the cwd', function () {
      const relativePath = relative(tempCwd, fixture('one.yml'));
      const config = readYamlConfig(relativePath);
      expect(config).toEqual({
        foo: 1,
        bar: true,
      });
    });

    it('fails to load relative paths, not found because of the cwd', function () {
      expect(function () {
        const relativePath = relative(
          resolve(__dirname, '../../'),
          fixture('one.yml')
        );

        readYamlConfig(relativePath);
      }).toThrowError(/ENOENT/);
    });
  });

});
