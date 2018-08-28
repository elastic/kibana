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
import cluster from 'cluster';
import { sample } from 'lodash';

import ClusterManager from './cluster_manager';
import Worker from './worker';

describe('CLI cluster manager', function () {
  const sandbox = sinon.createSandbox();

  beforeEach(function () {
    sandbox.stub(cluster, 'fork').callsFake(() => {
      return {
        process: {
          kill: sinon.stub(),
        },
        isDead: sinon.stub().returns(false),
        removeListener: sinon.stub(),
        on: sinon.stub(),
        send: sinon.stub()
      };
    });
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('has two workers', async function () {
    const manager = await ClusterManager.create({});

    expect(manager.workers).toHaveLength(2);
    for (const worker of manager.workers) expect(worker).toBeInstanceOf(Worker);

    expect(manager.optimizer).toBeInstanceOf(Worker);
    expect(manager.server).toBeInstanceOf(Worker);
  });

  it('delivers broadcast messages to other workers', async function () {
    const manager = await ClusterManager.create({});

    for (const worker of manager.workers) {
      Worker.prototype.start.call(worker);// bypass the debounced start method
      worker.onOnline();
    }

    const football = {};
    const messenger = sample(manager.workers);

    messenger.emit('broadcast', football);
    for (const worker of manager.workers) {
      if (worker === messenger) {
        expect(worker.fork.send.callCount).toBe(0);
      } else {
        expect(worker.fork.send.firstCall.args[0]).toBe(football);
      }
    }
  });
});
