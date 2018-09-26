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
import { TaskPoller } from './task_poller';
import { mockLogger, resolvable, sleep } from './test_utils';

describe('TaskPoller', () => {
  describe('interval tests', () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });

    afterEach(() => clock.restore());

    test('runs the work function on an interval', async () => {
      const pollInterval = _.random(10, 20);
      const done = resolvable();
      const work = sinon.spy(() => {
        done.resolve();
        return Promise.resolve();
      });
      const poller = new TaskPoller({
        pollInterval,
        work,
        logger: mockLogger(),
      });

      poller.start();

      sinon.assert.calledOnce(work);
      await done;

      clock.tick(pollInterval - 1);
      sinon.assert.calledOnce(work);
      clock.tick(1);
      sinon.assert.calledTwice(work);
    });
  });

  test('logs, but does not crash if the work function fails', async () => {
    let count = 0;
    const logger = mockLogger();
    const doneWorking = resolvable();
    const poller = new TaskPoller({
      logger,
      pollInterval: 1,
      work: async () => {
        ++count;
        if (count === 1) {
          throw new Error('Dang it!');
        }
        if (count > 1) {
          poller.stop();
          doneWorking.resolve();
        }
      },
    });

    poller.start();

    await doneWorking;

    expect(count).toEqual(2);
    sinon.assert.calledWithMatch(logger.error, /Dang it/i);
  });

  test('is stoppable', async () => {
    const doneWorking = resolvable();
    const work = sinon.spy(async () => {
      poller.stop();
      doneWorking.resolve();
    });

    const poller = new TaskPoller({
      logger: mockLogger(),
      pollInterval: 1,
      work,
    });

    poller.start();
    await doneWorking;
    await sleep(10);

    sinon.assert.calledOnce(work);
  });

  test('disregards duplicate calls to "start"', async () => {
    const doneWorking = resolvable();
    const work = sinon.spy(async () => {
      await doneWorking;
    });
    const poller = new TaskPoller({
      pollInterval: 1,
      logger: mockLogger(),
      work,
    });

    poller.start();
    poller.start();
    poller.start();
    poller.start();

    poller.stop();

    doneWorking.resolve();

    sinon.assert.calledOnce(work);
  });

  test('waits for work before polling', async () => {
    const doneWorking = resolvable();
    const work = sinon.spy(async () => {
      await sleep(10);
      poller.stop();
      doneWorking.resolve();
    });
    const poller = new TaskPoller({
      pollInterval: 1,
      logger: mockLogger(),
      work,
    });

    poller.start();
    await doneWorking;

    sinon.assert.calledOnce(work);
  });
});
