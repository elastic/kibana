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
/* eslint-env jest */

// eslint-disable-next-line max-classes-per-file
import EventEmitter from 'events';
import { assign, random } from 'lodash';
import { delay } from 'bluebird';

class MockClusterFork extends EventEmitter {
  public exitCode = 0;

  constructor(cluster: MockCluster) {
    super();

    let dead = true;

    function wait() {
      return delay(random(10, 250));
    }

    assign(this, {
      process: {
        kill: jest.fn(() => {
          (async () => {
            await wait();
            this.emit('disconnect');
            await wait();
            dead = true;
            this.emit('exit');
            cluster.emit('exit', this, this.exitCode || 0);
          })();
        }),
      },
      isDead: jest.fn(() => dead),
      send: jest.fn(),
    });

    jest.spyOn(this as EventEmitter, 'on');
    jest.spyOn(this as EventEmitter, 'off');
    jest.spyOn(this as EventEmitter, 'emit');

    (async () => {
      await wait();
      dead = false;
      this.emit('online');
    })();
  }
}

export class MockCluster extends EventEmitter {
  fork = jest.fn(() => new MockClusterFork(this));
  setupMaster = jest.fn();
}
