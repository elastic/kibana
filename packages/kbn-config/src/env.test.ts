/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockPackage } from './env.test.mocks';
import type { Package } from '@kbn/repo-packages';

import { Env, RawPackageInfo } from './env';
import { getEnvOptions } from './internal_mocks';

const REPO_ROOT = '/test/kibanaRoot';

const packageInfos: RawPackageInfo = {
  branch: 'master',
  version: '8.0.0',
  build: {
    number: 42,
    sha: 'one',
  },
};

beforeEach(() => {
  mockPackage.raw = {};
});

test('correctly creates default environment in dev mode.', () => {
  mockPackage.raw = {
    branch: 'some-branch',
    version: 'some-version',
  };

  const defaultEnv = Env.createDefault(
    REPO_ROOT,
    getEnvOptions({
      configs: ['/test/cwd/config/kibana.yml'],
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
    REPO_ROOT,
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
    REPO_ROOT,
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
    REPO_ROOT,
    getEnvOptions({
      cliArgs: { envName: 'development' },
      configs: ['/some/other/path/some-kibana.yml'],
    })
  );

  const defaultProdEnv = Env.createDefault(
    REPO_ROOT,
    getEnvOptions({
      cliArgs: { dev: false, envName: 'production' },
      configs: ['/some/other/path/some-kibana.yml'],
    })
  );

  expect(defaultDevEnv).toMatchSnapshot('dev env properties');
  expect(defaultProdEnv).toMatchSnapshot('prod env properties');
});

test('correctly creates environment with constructor.', () => {
  const env = new Env(
    '/some/home/dir',
    {
      branch: 'feature-v1',
      version: 'v1',
      build: {
        distributable: true,
        number: 100,
        sha: 'feature-v1-build-sha',
      },
    },
    getEnvOptions({
      cliArgs: { dev: false },
      configs: ['/some/other/path/some-kibana.yml'],
      repoPackages: ['FakePackage1', 'FakePackage2'] as unknown as Package[],
    })
  );

  expect(env).toMatchSnapshot('env properties');
});

test('pluginSearchPaths only includes kibana-extra, regardless of plugin filters', () => {
  const env = new Env(
    '/some/home/dir',
    packageInfos,
    getEnvOptions({
      cliArgs: {
        oss: false,
        runExamples: false,
      },
    })
  );

  expect(env.pluginSearchPaths).toEqual(['/some/home/kibana-extra', '/some/home/dir/plugins']);

  const env2 = new Env(
    '/some/home/dir',
    packageInfos,
    getEnvOptions({
      cliArgs: {
        oss: true,
        runExamples: true,
      },
    })
  );

  expect(env2.pluginSearchPaths).toEqual(['/some/home/kibana-extra', '/some/home/dir/plugins']);

  const env3 = new Env(
    '/some/home/dir',
    packageInfos,
    getEnvOptions({
      cliArgs: {
        oss: true,
        runExamples: false,
      },
    })
  );

  expect(env3.pluginSearchPaths).toEqual(['/some/home/kibana-extra', '/some/home/dir/plugins']);

  const env4 = new Env(
    '/some/home/dir',
    packageInfos,
    getEnvOptions({
      cliArgs: {
        oss: false,
        runExamples: true,
      },
    })
  );

  expect(env4.pluginSearchPaths).toEqual(['/some/home/kibana-extra', '/some/home/dir/plugins']);
});
