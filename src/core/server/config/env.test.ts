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

jest.mock('process', () => ({
  cwd() {
    return '/test/cwd';
  },
}));

jest.mock('path', () => ({
  resolve(...pathSegments: string[]) {
    return pathSegments.join('/');
  },
}));

const mockPackage = new Proxy({ raw: {} as any }, { get: (obj, prop) => obj.raw[prop] });
jest.mock('../../../utils/package_json', () => ({ pkg: mockPackage }));

import { Env } from '.';
import { getEnvOptions } from './__mocks__/env';

test('correctly creates default environment in dev mode.', () => {
  mockPackage.raw = {
    branch: 'some-branch',
    version: 'some-version',
  };

  const defaultEnv = Env.createDefault(
    getEnvOptions({
      configs: ['/test/cwd/config/kibana.yml'],
      isDevClusterMaster: true,
    })
  );

  expect(defaultEnv).toMatchSnapshot('env properties');
});

test('correctly creates default environment in prod distributable mode.', () => {
  mockPackage.raw = {
    branch: 'feature-v1',
    version: 'v1',
    build: {
      distributable: true,
      number: 100,
      sha: 'feature-v1-build-sha',
    },
  };

  const defaultEnv = Env.createDefault(
    getEnvOptions({
      cliArgs: { dev: false },
      configs: ['/some/other/path/some-kibana.yml'],
    })
  );

  expect(defaultEnv).toMatchSnapshot('env properties');
});

test('correctly creates default environment in prod non-distributable mode.', () => {
  mockPackage.raw = {
    branch: 'feature-v1',
    version: 'v1',
    build: {
      distributable: false,
      number: 100,
      sha: 'feature-v1-build-sha',
    },
  };

  const defaultEnv = Env.createDefault(
    getEnvOptions({
      cliArgs: { dev: false },
      configs: ['/some/other/path/some-kibana.yml'],
    })
  );

  expect(defaultEnv).toMatchSnapshot('env properties');
});

test('correctly creates default environment if `--env.name` is supplied.', () => {
  mockPackage.raw = {
    branch: 'feature-v1',
    version: 'v1',
    build: {
      distributable: false,
      number: 100,
      sha: 'feature-v1-build-sha',
    },
  };

  const defaultDevEnv = Env.createDefault(
    getEnvOptions({
      cliArgs: { envName: 'development' },
      configs: ['/some/other/path/some-kibana.yml'],
    })
  );

  const defaultProdEnv = Env.createDefault(
    getEnvOptions({
      cliArgs: { dev: false, envName: 'production' },
      configs: ['/some/other/path/some-kibana.yml'],
    })
  );

  expect(defaultDevEnv).toMatchSnapshot('dev env properties');
  expect(defaultProdEnv).toMatchSnapshot('prod env properties');
});

test('correctly creates environment with constructor.', () => {
  mockPackage.raw = {
    branch: 'feature-v1',
    version: 'v1',
    build: {
      distributable: true,
      number: 100,
      sha: 'feature-v1-build-sha',
    },
  };

  const env = new Env(
    '/some/home/dir',
    getEnvOptions({
      cliArgs: { dev: false },
      configs: ['/some/other/path/some-kibana.yml'],
    })
  );

  expect(env).toMatchSnapshot('env properties');
});
