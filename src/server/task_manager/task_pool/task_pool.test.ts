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

import sinon from 'sinon';
import { TaskPool } from './task_pool';
import { mockLogger, resolvable, sleep } from './test_utils';

describe('TaskPool', () => {
  test('occupiedWorkers are a sum of worker costs', async () => {
    const pool = new TaskPool({
      totalCapacity: 200,
      logger: mockLogger(),
    });

    const result = await pool.run([
      { ...mockTask(), numWorkers: 10 },
      { ...mockTask(), numWorkers: 20 },
      { ...mockTask(), numWorkers: 30 },
    ]);

    expect(result).toBeTruthy();
    expect(pool.occupiedWorkers).toEqual(60);
  });

  test('availableWorkers are a function of total_capacity - occupiedWorkers', async () => {
    const pool = new TaskPool({
      totalCapacity: 100,
      logger: mockLogger(),
    });

    const result = await pool.run([
      { ...mockTask(), numWorkers: 20 },
      { ...mockTask(), numWorkers: 30 },
      { ...mockTask(), numWorkers: 40 },
    ]);

    expect(result).toBeTruthy();
    expect(pool.availableWorkers).toEqual(10);
  });

  test('does not run tasks that are beyond its available capacity', async () => {
    const pool = new TaskPool({
      totalCapacity: 10,
      logger: mockLogger(),
    });

    const shouldRun = mockRun();
    const shouldNotRun = mockRun();

    const result = await pool.run([
      { ...mockTask(), numWorkers: 9, run: shouldRun },
      { ...mockTask(), numWorkers: 9, run: shouldNotRun },
    ]);

    expect(result).toBeFalsy();
    expect(pool.availableWorkers).toEqual(1);
    sinon.assert.calledOnce(shouldRun);
    sinon.assert.notCalled(shouldNotRun);
  });

  test('clears up capacity when a task completes', async () => {
    const pool = new TaskPool({
      totalCapacity: 10,
      logger: mockLogger(),
    });

    const firstWork = resolvable();
    const firstRun = sinon.spy(async () => {
      await sleep(0);
      firstWork.resolve();
    });
    const secondWork = resolvable();
    const secondRun = sinon.spy(async () => {
      await sleep(0);
      secondWork.resolve();
    });

    const result = await pool.run([
      { ...mockTask(), numWorkers: 9, run: firstRun },
      { ...mockTask(), numWorkers: 2, run: secondRun },
    ]);

    expect(result).toBeFalsy();
    expect(pool.occupiedWorkers).toEqual(9);
    expect(pool.availableWorkers).toEqual(1);

    await firstWork;
    sinon.assert.calledOnce(firstRun);
    sinon.assert.notCalled(secondRun);

    await pool.run([{ ...mockTask(), numWorkers: 2, run: secondRun }]);

    expect(pool.occupiedWorkers).toEqual(2);
    expect(pool.availableWorkers).toEqual(8);

    await secondWork;

    expect(pool.occupiedWorkers).toEqual(0);
    expect(pool.availableWorkers).toEqual(10);
    sinon.assert.calledOnce(secondRun);
  });

  test('run cancels expired tasks prior to running new tasks', async () => {
    const pool = new TaskPool({
      totalCapacity: 10,
      logger: mockLogger(),
    });

    const expired = resolvable();
    const shouldRun = sinon.spy(() => Promise.resolve());
    const shouldNotRun = sinon.spy(() => Promise.resolve());
    const result = await pool.run([
      {
        ...mockTask(),
        numWorkers: 9,
        async run() {
          this.isExpired = true;
          expired.resolve();
          await sleep(10);
          return {};
        },
        cancel: shouldRun,
      },
      {
        ...mockTask(),
        numWorkers: 1,
        async run() {
          await sleep(10);
          return {};
        },
        cancel: shouldNotRun,
      },
    ]);

    expect(result).toBeTruthy();
    expect(pool.occupiedWorkers).toEqual(10);
    expect(pool.availableWorkers).toEqual(0);

    await expired;

    expect(await pool.run([{ ...mockTask(), numWorkers: 7 }])).toBeTruthy();
    sinon.assert.calledOnce(shouldRun);
    sinon.assert.notCalled(shouldNotRun);

    expect(pool.occupiedWorkers).toEqual(8);
    expect(pool.availableWorkers).toEqual(2);
  });

  test('logs if cancellation errors', async () => {
    const logger = mockLogger();
    const pool = new TaskPool({
      logger,
      totalCapacity: 20,
    });

    const cancelled = resolvable();
    const result = await pool.run([
      {
        ...mockTask(),
        numWorkers: 7,
        async run() {
          this.isExpired = true;
          await sleep(10);
          return {};
        },
        async cancel() {
          cancelled.resolve();
          throw new Error('Dern!');
        },
        toString: () => '"shooooo!"',
      },
    ]);

    expect(result).toBeTruthy();
    await pool.run([]);

    expect(pool.occupiedWorkers).toEqual(0);

    // Allow the task to cancel...
    await cancelled;

    sinon.assert.calledWithMatch(logger.error, /Failed to cancel task "shooooo!"/);
  });

  function mockRun() {
    return sinon.spy(async () => sleep(0));
  }

  function mockTask() {
    return {
      numWorkers: 1,
      isExpired: false,
      cancel: async () => undefined,
      claimOwnership: async () => true,
      run: mockRun(),
    };
  }
});
