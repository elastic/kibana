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

import fs from 'fs';
import { join, resolve } from 'path';

jest.mock('fs');
jest.mock('@kbn/dev-utils', () => {
  return { REPO_ROOT: '/dev/null/root' };
});

import { REPO_ROOT } from '@kbn/dev-utils';
import { Lifecycle } from './lifecycle';
import { TestTracker } from './test_tracker';

const DEFAULT_TEST_METADATA_PATH = join(REPO_ROOT, 'target', 'test_metadata.json');
const MOCK_CONFIG_PATH = join('test', 'config.js');
const MOCK_TEST_PATH = join('test', 'apps', 'test.js');
const ENVS_TO_RESET = ['TEST_METADATA_PATH'];

describe('TestTracker', () => {
  const originalEnvs: Record<string, string> = {};

  beforeEach(() => {
    for (const env of ENVS_TO_RESET) {
      if (env in process.env) {
        originalEnvs[env] = process.env[env] || '';
        delete process.env[env];
      }
    }
  });

  afterEach(() => {
    for (const env of ENVS_TO_RESET) {
      delete process.env[env];
    }

    for (const env of Object.keys(originalEnvs)) {
      process.env[env] = originalEnvs[env];
    }

    jest.resetAllMocks();
  });

  let MOCKS: Record<string, object>;

  const createMock = (overrides = {}) => {
    return {
      ftrConfig: {
        path: resolve(REPO_ROOT, MOCK_CONFIG_PATH),
      },
      file: resolve(REPO_ROOT, MOCK_TEST_PATH),
      title: 'A Test',
      suiteTag: MOCK_TEST_PATH,
      ...overrides,
    };
  };

  const runLifecycleWithMocks = async (mocks: object[]) => {
    const lifecycle = new Lifecycle();
    const testTracker = new TestTracker(lifecycle);

    for (const mock of mocks) {
      await lifecycle.beforeTestSuite.trigger(mock);
    }

    for (const mock of mocks.reverse()) {
      await lifecycle.afterTestSuite.trigger(mock);
    }

    return { lifecycle, testTracker };
  };

  beforeEach(() => {
    MOCKS = {
      WITH_TESTS: createMock({ tests: [{}] }), // i.e. a describe with tests in it
      WITHOUT_TESTS: createMock(), // i.e. a describe with only other describes in it
    };
  });

  it('collects metadata for a single suite with multiple describe()s', async () => {
    const { testTracker } = await runLifecycleWithMocks([MOCKS.WITHOUT_TESTS, MOCKS.WITH_TESTS]);

    const suites = testTracker.getAllFinishedSuites();
    expect(suites.length).toBe(1);
    const suite = suites[0];

    expect(suite).toMatchObject({
      config: MOCK_CONFIG_PATH,
      file: MOCK_TEST_PATH,
      tag: MOCK_TEST_PATH,
      leafSuite: true,
      success: true,
    });
  });

  it('writes metadata to a file when cleanup is triggered', async () => {
    const { lifecycle, testTracker } = await runLifecycleWithMocks([MOCKS.WITH_TESTS]);
    await lifecycle.cleanup.trigger();

    const suites = testTracker.getAllFinishedSuites();

    const call = (fs.writeFileSync as jest.Mock).mock.calls[0];
    expect(call[0]).toEqual(DEFAULT_TEST_METADATA_PATH);
    expect(call[1]).toEqual(JSON.stringify(suites, null, 2));
  });

  it('respects TEST_METADATA_PATH env var for metadata target override', async () => {
    process.env.TEST_METADATA_PATH = '/dev/null/fake-test-path';
    const { lifecycle } = await runLifecycleWithMocks([MOCKS.WITH_TESTS]);
    await lifecycle.cleanup.trigger();

    expect((fs.writeFileSync as jest.Mock).mock.calls[0][0]).toEqual(
      process.env.TEST_METADATA_PATH
    );
  });
});
