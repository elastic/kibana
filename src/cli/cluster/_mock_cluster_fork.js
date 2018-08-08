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

import EventEmitter from 'events';
import { assign, random } from 'lodash';
import sinon from 'sinon';
import cluster from 'cluster';
import { delay } from 'bluebird';

export default class MockClusterFork extends EventEmitter {
  constructor() {
    super();

    let dead = true;

    function wait() {
      return delay(random(10, 250));
    }

    assign(this, {
      process: {
        kill: sinon.spy(() => {
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
      isDead: sinon.spy(() => dead),
      send: sinon.stub()
    });

    sinon.spy(this, 'on');
    sinon.spy(this, 'removeListener');
    sinon.spy(this, 'emit');

    (async () => {
      await wait();
      dead = false;
      this.emit('online');
    })();
  }
}
