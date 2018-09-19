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

import _ from 'lodash';
import sinon from 'sinon';
import { TaskManager } from './task_manager';

describe('TaskManager', () => {
  let clock: sinon.SinonFakeTimers;
  const defaultConfig = {
    task_manager: {
      max_workers: 10,
      override_num_workers: {},
      index: 'foo',
      max_attempts: 9,
      poll_interval: 6000000,
    },
  };

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => clock.restore());

  test('disallows multiple inits', async () => {
    const manager = new TaskManager();
    const opts = testOpts();

    await expect(manager.init(opts)).resolves.toBeUndefined();
    await expect(manager.init(opts)).rejects.toThrow(/The task manager is already initialized/i);
  });

  test('disallows schedule before init', async () => {
    const manager = new TaskManager();
    const task = {
      taskType: 'foo',
      params: {},
    };
    await expect(manager.schedule(task)).rejects.toThrow(/The task manager is still initializing/i);
  });

  test('disallows fetch before init', async () => {
    const manager = new TaskManager();
    await expect(manager.fetch({})).rejects.toThrow(/The task manager is still initializing/i);
  });

  test('disallows remove before init', async () => {
    const manager = new TaskManager();
    await expect(manager.remove('23')).rejects.toThrow(/The task manager is still initializing/i);
  });

  test('allows middleware registration before init', () => {
    const manager = new TaskManager();
    const middleware = {
      beforeSave: async (saveOpts: any) => saveOpts,
      beforeRun: async (runOpts: any) => runOpts,
    };
    expect(() => manager.addMiddleware(middleware)).not.toThrow();
  });

  test('disallows middleware registration after init', async () => {
    const manager = new TaskManager();
    const middleware = {
      beforeSave: async (saveOpts: any) => saveOpts,
      beforeRun: async (runOpts: any) => runOpts,
    };
    await manager.init(testOpts());
    expect(() => manager.addMiddleware(middleware)).toThrow(
      /Cannot add middleware after the task manager is initialized/i
    );
  });

  function testOpts() {
    return {
      config: {
        get: (path: string) => _.get(defaultConfig, path),
      },
      kbnServer: {
        uiExports: {
          taskDefinitions: {},
        },
      },
      server: {
        log: _.noop,
        plugins: {
          elasticsearch: {
            getCluster: () => ({ callWithInternalUser: _.noop }),
          },
        },
      },
    };
  }
});
