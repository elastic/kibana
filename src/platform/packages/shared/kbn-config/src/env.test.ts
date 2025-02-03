/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockPackage } from './env.test.mocks';
import type { Package } from '@kbn/repo-packages';

import { Env, RawPackageInfo } from './env';
import { getEnvOptions } from './internal_mocks';

const REPO_ROOT = '/test/kibanaRoot';
const BUILD_DATE = '2023-05-15T23:12:09+0000';

const packageInfos: RawPackageInfo = {
  branch: 'master',
  version: '8.0.0',
  build: {
    number: 42,
    sha: 'one',
    date: new Date(BUILD_DATE).toISOString(),
  },
};

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(BUILD_DATE));
});

beforeEach(() => {
  mockPackage.raw = {};
});

afterAll(() => {
  jest.useRealTimers();
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
      date: BUILD_DATE,
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
      date: BUILD_DATE,
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
      date: BUILD_DATE,
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
        date: BUILD_DATE,
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

describe('packageInfo.buildFlavor', () => {
  it('is set to `serverless` when the `serverless` cli flag is `true`', () => {
    mockPackage.raw = {
      branch: 'some-branch',
      version: 'some-version',
    };

    const env = Env.createDefault(
      REPO_ROOT,
      getEnvOptions({
        configs: ['/test/cwd/config/kibana.yml'],
        cliArgs: {
          serverless: true,
        },
      })
    );

    expect(env.packageInfo.buildFlavor).toEqual('serverless');
  });

  it('is set to `traditional` when the `serverless` cli flag is `false`', () => {
    mockPackage.raw = {
      branch: 'some-branch',
      version: 'some-version',
    };

    const env = Env.createDefault(
      REPO_ROOT,
      getEnvOptions({
        configs: ['/test/cwd/config/kibana.yml'],
        cliArgs: {
          serverless: false,
        },
      })
    );

    expect(env.packageInfo.buildFlavor).toEqual('traditional');
  });
});

describe('packageInfo.buildShaShort', () => {
  const sha = 'c6e1a25bea71a623929a8f172c0273bf0c811ca0';
  it('provides the sha and a short version of the sha', () => {
    mockPackage.raw = {
      branch: 'some-branch',
      version: 'some-version',
    };

    const env = new Env(
      '/some/home/dir',
      {
        branch: 'whathaveyou',
        version: 'v1',
        build: {
          distributable: true,
          number: 100,
          sha,
          date: BUILD_DATE,
        },
      },
      getEnvOptions({
        cliArgs: { dev: false },
        configs: ['/some/other/path/some-kibana.yml'],
        repoPackages: ['FakePackage1', 'FakePackage2'] as unknown as Package[],
      })
    );

    expect(env.packageInfo.buildSha).toEqual('c6e1a25bea71a623929a8f172c0273bf0c811ca0');
    expect(env.packageInfo.buildShaShort).toEqual('c6e1a25bea71');
  });
});
