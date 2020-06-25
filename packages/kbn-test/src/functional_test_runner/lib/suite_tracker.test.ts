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
import { SuiteTracker } from './suite_tracker';

const DEFAULT_TEST_METADATA_PATH = join(REPO_ROOT, 'target', 'test_metadata.json');
const MOCK_CONFIG_PATH = join('test', 'config.js');
const MOCK_TEST_PATH = join('test', 'apps', 'test.js');
const ENVS_TO_RESET = ['TEST_METADATA_PATH'];

describe('SuiteTracker', () => {
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
      file: resolve(REPO_ROOT, MOCK_TEST_PATH),
      title: 'A Test',
      suiteTag: MOCK_TEST_PATH,
      ...overrides,
    };
  };

  const runLifecycleWithMocks = async (mocks: object[], fn: (objs: any) => any = () => {}) => {
    const lifecycle = new Lifecycle();
    const suiteTracker = SuiteTracker.startTracking(
      lifecycle,
      resolve(REPO_ROOT, MOCK_CONFIG_PATH)
    );

    const ret = { lifecycle, suiteTracker };

    for (const mock of mocks) {
      await lifecycle.beforeTestSuite.trigger(mock);
    }

    if (fn) {
      fn(ret);
    }

    for (const mock of mocks.reverse()) {
      await lifecycle.afterTestSuite.trigger(mock);
    }

    return ret;
  };

  beforeEach(() => {
    MOCKS = {
      WITH_TESTS: createMock({ tests: [{}] }), // i.e. a describe with tests in it
      WITHOUT_TESTS: createMock(), // i.e. a describe with only other describes in it
    };
  });

  it('collects metadata for a single suite with multiple describe()s', async () => {
    const { suiteTracker } = await runLifecycleWithMocks([MOCKS.WITHOUT_TESTS, MOCKS.WITH_TESTS]);

    const suites = suiteTracker.getAllFinishedSuites();
    expect(suites.length).toBe(1);
    const suite = suites[0];

    expect(suite).toMatchObject({
      config: MOCK_CONFIG_PATH,
      file: MOCK_TEST_PATH,
      tag: MOCK_TEST_PATH,
      hasTests: true,
      success: true,
    });
  });

  it('writes metadata to a file when cleanup is triggered', async () => {
    const { lifecycle, suiteTracker } = await runLifecycleWithMocks([MOCKS.WITH_TESTS]);
    await lifecycle.cleanup.trigger();

    const suites = suiteTracker.getAllFinishedSuites();

    const call = (fs.writeFileSync as jest.Mock).mock.calls[0];
    expect(call[0]).toEqual(DEFAULT_TEST_METADATA_PATH);
    expect(call[1]).toEqual(JSON.stringify(suites, null, 2));
  });

  it('respects TEST_METADATA_PATH env var for metadata target override', async () => {
    process.env.TEST_METADATA_PATH = resolve(REPO_ROOT, '../fake-test-path');
    const { lifecycle } = await runLifecycleWithMocks([MOCKS.WITH_TESTS]);
    await lifecycle.cleanup.trigger();

    expect((fs.writeFileSync as jest.Mock).mock.calls[0][0]).toEqual(
      process.env.TEST_METADATA_PATH
    );
  });

  it('identifies suites with tests as leaf suites', async () => {
    const root = createMock({ title: 'root', file: join(REPO_ROOT, 'root.js') });
    const parent = createMock({ parent: root });
    const withTests = createMock({ parent, tests: [{}] });

    const { suiteTracker } = await runLifecycleWithMocks([root, parent, withTests]);
    const suites = suiteTracker.getAllFinishedSuites();

    const finishedRoot = suites.find((s) => s.title === 'root');
    const finishedWithTests = suites.find((s) => s.title !== 'root');

    expect(finishedRoot).toBeTruthy();
    expect(finishedRoot?.hasTests).toBeFalsy();
    expect(finishedWithTests?.hasTests).toBe(true);
  });

  describe('with a failing suite', () => {
    let root: any;
    let parent: any;
    let failed: any;

    beforeEach(() => {
      root = createMock({ file: join(REPO_ROOT, 'root.js') });
      parent = createMock({ parent: root });
      failed = createMock({ parent, tests: [{}] });
    });

    it('marks parent suites as not successful when a test fails', async () => {
      const { suiteTracker } = await runLifecycleWithMocks(
        [root, parent, failed],
        async ({ lifecycle }) => {
          await lifecycle.testFailure.trigger(Error('test'), { parent: failed });
        }
      );

      const suites = suiteTracker.getAllFinishedSuites();
      expect(suites.length).toBe(2);
      for (const suite of suites) {
        expect(suite.success).toBeFalsy();
      }
    });

    it('marks parent suites as not successful when a test hook fails', async () => {
      const { suiteTracker } = await runLifecycleWithMocks(
        [root, parent, failed],
        async ({ lifecycle }) => {
          await lifecycle.testHookFailure.trigger(Error('test'), { parent: failed });
        }
      );

      const suites = suiteTracker.getAllFinishedSuites();
      expect(suites.length).toBe(2);
      for (const suite of suites) {
        expect(suite.success).toBeFalsy();
      }
    });
  });
});
