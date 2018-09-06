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
import { Cancellable } from '../../../utils/cancellable/cancellable';
import { ConcreteTaskInstance, TaskDefinition } from './task';
import { minutesFromNow } from './task_intervals';
import { TaskRunner } from './task_runner';

describe('TaskRunner', () => {
  test('provides details about the task that is running', () => {
    const { runner } = testOpts({
      instance: {
        id: 'foo',
        taskType: 'bar',
      },
    });

    expect(runner.id).toEqual('foo');
    expect(runner.type).toEqual('bar');
    expect(runner.toString()).toEqual('bar "foo"');
  });

  test('warns if the task returns an unexpected result', async () => {
    await allowsReturnType(undefined);
    await allowsReturnType({});
    await allowsReturnType({
      runAt: new Date(),
    });
    await allowsReturnType({
      error: new Error('Dang it!'),
    });
    await allowsReturnType({
      state: { shazm: true },
    });
    await disallowsReturnType('hm....');
    await disallowsReturnType({
      whatIsThis: '?!!?',
    });
  });

  test('queues a reattempt if the task fails', async () => {
    const initialAttempts = _.random(0, 2);
    const id = Date.now().toString();
    const { runner, store } = testOpts({
      instance: {
        id,
        attempts: initialAttempts,
        params: { a: 'b' },
        state: { hey: 'there' },
      },
      definition: {
        run: async () => {
          throw new Error('Dangit!');
        },
      },
    });

    await runner.run();

    sinon.assert.calledOnce(store.update);
    const instance = store.update.args[0][0];

    expect(instance.id).toEqual(id);
    expect(instance.attempts).toEqual(initialAttempts + 1);
    expect(instance.runAt.getTime()).toBeGreaterThan(Date.now());
    expect(instance.params).toEqual({ a: 'b' });
    expect(instance.state).toEqual({ hey: 'there' });
  });

  test('reschedules tasks that have an interval', async () => {
    const { runner, store } = testOpts({
      instance: {
        interval: '10m',
      },
    });

    await runner.run();

    sinon.assert.calledOnce(store.update);
    const instance = store.update.args[0][0];

    expect(instance.runAt.getTime()).toBeGreaterThan(minutesFromNow(9).getTime());
    expect(instance.runAt.getTime()).toBeLessThanOrEqual(minutesFromNow(10).getTime());
  });

  test('reschedules tasks that return a runAt', async () => {
    const runAt = minutesFromNow(_.random(1, 10));
    const { runner, store } = testOpts({
      definition: {
        run: async () => {
          return { runAt };
        },
      },
    });

    await runner.run();

    sinon.assert.calledOnce(store.update);
    sinon.assert.calledWithMatch(store.update, { runAt });
  });

  test('tasks that return runAt override interval', async () => {
    const runAt = minutesFromNow(_.random(5));
    const { runner, store } = testOpts({
      instance: {
        interval: '20m',
      },
      definition: {
        run: async () => {
          return { runAt };
        },
      },
    });

    await runner.run();

    sinon.assert.calledOnce(store.update);
    sinon.assert.calledWithMatch(store.update, { runAt });
  });

  test('removes non-recurring tasks after they complete', async () => {
    const id = _.random(1, 20).toString();
    const { runner, store } = testOpts({
      instance: {
        id,
        interval: undefined,
      },
      definition: {
        run: async () => undefined,
      },
    });

    await runner.run();

    sinon.assert.calledOnce(store.remove);
    sinon.assert.calledWith(store.remove, id);
  });

  test('cancel cancels the promise, if it is cancellable', async () => {
    let wasCancelled = false;
    const { runner, logger } = testOpts({
      definition: {
        run: () => {
          let timeout: any;

          return new Cancellable<undefined>()
            .then(
              () =>
                new Promise(r => {
                  timeout = setTimeout(r, 1000);
                })
            )
            .cancelled(() => {
              clearTimeout(timeout);
              wasCancelled = true;
            });
        },
      },
    });

    const promise = runner.run();
    await runner.cancel();
    await promise;

    expect(wasCancelled).toBeTruthy();
    sinon.assert.neverCalledWithMatch(logger.warning, /not cancellable/);
  });

  test('warns if cancel is called on a non-cancellable promise', async () => {
    const { runner, logger } = testOpts({
      definition: {
        run: async () => undefined,
      },
    });

    const promise = runner.run();
    await runner.cancel();
    await promise;

    sinon.assert.calledWithMatch(logger.warning, /not cancellable/);
  });

  interface TestOpts {
    instance?: Partial<ConcreteTaskInstance>;
    definition?: Partial<TaskDefinition>;
  }

  function testOpts(opts: TestOpts) {
    const callCluster = sinon.stub();
    const run = sinon.stub();
    const logger = {
      debug: sinon.stub(),
      info: sinon.stub(),
      warning: sinon.stub(),
    };
    const store = {
      update: sinon.stub(),
      remove: sinon.stub(),
    };
    const runner = new TaskRunner({
      callCluster,
      logger,
      store,
      kbnServer: sinon.stub(),
      instance: Object.assign(
        {
          id: 'foo',
          taskType: 'bar',
          version: 32,
          runAt: new Date(),
          attempts: 0,
          params: {},
          scope: 'reporting',
          state: {},
          status: 'idle',
          user: 'example',
        },
        opts.instance || {}
      ),
      definition: Object.assign(
        {
          type: 'bar',
          title: 'Bar!',
          run,
        },
        opts.definition || {}
      ),
    });

    return {
      callCluster,
      run,
      runner,
      logger,
      store,
    };
  }

  async function testReturn(result: any, shouldBeValid: boolean) {
    const { runner, logger } = testOpts({
      definition: {
        run: async () => result,
      },
    });

    await runner.run();

    try {
      if (shouldBeValid) {
        sinon.assert.notCalled(logger.warning);
      } else {
        sinon.assert.calledWith(logger.warning, sinon.match(/invalid task result/i));
      }
    } catch (err) {
      sinon.assert.fail(
        `Expected result ${JSON.stringify(result)} to be ${shouldBeValid ? 'valid' : 'invalid'}`
      );
    }
  }

  function allowsReturnType(result: any) {
    return testReturn(result, true);
  }

  function disallowsReturnType(result: any) {
    return testReturn(result, false);
  }
});
