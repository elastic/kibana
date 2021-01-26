/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mockPackage } from './env.test.mocks';

import { Env, RawPackageInfo } from './env';
import { getEnvOptions } from './__mocks__/env';

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
      isDevCliParent: true,
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
    })
  );

  expect(env).toMatchSnapshot('env properties');
});

test('pluginSearchPaths contains x-pack plugins path if --oss flag is false', () => {
  const env = new Env(
    '/some/home/dir',
    packageInfos,
    getEnvOptions({
      cliArgs: { oss: false },
    })
  );

  expect(env.pluginSearchPaths).toContain('/some/home/dir/x-pack/plugins');
});

test('pluginSearchPaths does not contains x-pack plugins path if --oss flag is true', () => {
  const env = new Env(
    '/some/home/dir',
    packageInfos,
    getEnvOptions({
      cliArgs: { oss: true },
    })
  );

  expect(env.pluginSearchPaths).not.toContain('/some/home/dir/x-pack/plugins');
});

test('pluginSearchPaths contains examples plugins path if --run-examples flag is true', () => {
  const env = new Env(
    '/some/home/dir',
    packageInfos,
    getEnvOptions({
      cliArgs: { runExamples: true },
    })
  );

  expect(env.pluginSearchPaths).toContain('/some/home/dir/examples');
});

test('pluginSearchPaths contains x-pack/examples plugins path if --run-examples flag is true', () => {
  const env = new Env(
    '/some/home/dir',
    packageInfos,
    getEnvOptions({
      cliArgs: { runExamples: true },
    })
  );

  expect(env.pluginSearchPaths).toContain('/some/home/dir/x-pack/examples');
});

test('pluginSearchPaths does not contain x-pack/examples plugins path if --oss flag is true', () => {
  const env = new Env(
    '/some/home/dir',
    packageInfos,
    getEnvOptions({
      cliArgs: { runExamples: true, oss: true },
    })
  );

  expect(env.pluginSearchPaths).not.toContain('/some/home/dir/x-pack/examples');
});

test('pluginSearchPaths does not contains examples plugins path if --run-examples flag is false', () => {
  const env = new Env(
    '/some/home/dir',
    packageInfos,
    getEnvOptions({
      cliArgs: { runExamples: false },
    })
  );

  expect(env.pluginSearchPaths).not.toContain('/some/home/dir/examples');
});

test('pluginSearchPaths does not contains x-pack/examples plugins path if --run-examples flag is false', () => {
  const env = new Env(
    '/some/home/dir',
    packageInfos,
    getEnvOptions({
      cliArgs: { runExamples: false },
    })
  );

  expect(env.pluginSearchPaths).not.toContain('/some/home/dir/x-pack/examples');
});
