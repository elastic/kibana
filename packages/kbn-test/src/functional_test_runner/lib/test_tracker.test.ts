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

const MOCK_CONFIG_PATH = join('test', 'config.js');
const MOCK_TEST_PATH = join('test', 'apps', 'test.js');

describe('TestTracker', () => {
  let mocks: Record<string, any>;

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

  beforeEach(() => {
    mocks = {
      WITH_TESTS: createMock({ tests: [{}] }),
      WITHOUT_TESTS: createMock(),
    };
  });

  it('collects metadata for the current test', async () => {
    const lifecycle = new Lifecycle();
    const testTracker = new TestTracker(lifecycle);

    const mockSuite = mocks.WITH_TESTS;
    await lifecycle.beforeTestSuite.trigger(mockSuite);
    await lifecycle.afterTestSuite.trigger(mockSuite);
    // await lifecycle.cleanup.trigger();

    const suites = testTracker.getAllFinishedSuites();
    expect(suites.length).toBe(1);
    const suite = suites[0];

    // [{"config": "test/config.js", "duration": 0, "endTime": 2020-04-03T16:10:59.115Z, "file": "test/apps/test.js",
    // "leafSuite": true, "startTime": 2020-04-03T16:10:59.115Z, "success": true, "tag": undefined, "title": undefined}]

    // expect(fs.writeFileSync).toHaveBeenCalledWith(1);
    expect(suite).toMatchObject({
      config: MOCK_CONFIG_PATH,
      file: MOCK_TEST_PATH,
      tag: MOCK_TEST_PATH,
      leafSuite: true,
      success: true,
    });
  });
});
