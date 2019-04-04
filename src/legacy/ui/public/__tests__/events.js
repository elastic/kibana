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
import ngMock from 'ng_mock';
import { EventsProvider } from '../events';

describe('events', function () {
  require('test_utils/no_digest_promises').activateForSuite();

  let events;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    const Events = Private(EventsProvider);
    events = new Events();
  }));

  it('calls emitted handlers asynchronously', (done) => {
    const listenerStub = sinon.stub();
    events.on('test', listenerStub);
    events.emit('test');
    sinon.assert.notCalled(listenerStub);

    setTimeout(() => {
      sinon.assert.calledOnce(listenerStub);
      done();
    }, 100);
  });

  it('calling off after an emit that has not yet triggered the handler, will not call the handler', (done) => {
    const listenerStub = sinon.stub();
    events.on('test', listenerStub);
    events.emit('test');
    // It's called asynchronously so it shouldn't be called yet.
    sinon.assert.notCalled(listenerStub);
    events.off('test', listenerStub);

    setTimeout(() => {
      sinon.assert.notCalled(listenerStub);
      done();
    }, 100);
  });
});
