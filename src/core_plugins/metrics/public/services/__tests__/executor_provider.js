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

import { expect } from 'chai';
import sinon from 'sinon';
import executorProvider from '../executor_provider';
import Promise from 'bluebird';
import { timefilter } from 'ui/timefilter';

describe('$executor service', () => {
  let executor;
  let $timeout;

  beforeEach(() => {

    $timeout = sinon.spy(setTimeout);
    $timeout.cancel = (id) => clearTimeout(id);

    timefilter.setRefreshInterval({
      pause: false,
      value: 0
    });

    executor = executorProvider(Promise, $timeout);
  });

  afterEach(() => executor.destroy());

  it('should register listener for fetch upon start', () => {
    executor.start();
    const listeners = timefilter.listeners('fetch');
    const handlerFunc = listeners.find(listener => {
      return listener.name === 'reFetch';
    });
    expect(handlerFunc).to.not.be.null;
  });

  it('should register listener for refreshIntervalUpdate upon start', () => {
    executor.start();
    const listeners = timefilter.listeners('refreshIntervalUpdate');
    const handlerFunc = listeners.find(listener => {
      return listener.name === 'killIfPaused';
    });
    expect(handlerFunc).to.not.be.null;
  });

  it('should not call $timeout if the timefilter is not paused and set to zero', () => {
    executor.start();
    expect($timeout.callCount).to.equal(0);
  });

  it('should call $timeout if the timefilter is not paused and set to 1000ms', () => {
    timefilter.setRefreshInterval({
      value: 1000
    });
    executor.start();
    expect($timeout.callCount).to.equal(1);
  });

  it('should execute function if ingorePause is passed (interval set to 1000ms)', (done) => {
    timefilter.setRefreshInterval({
      value: 1000
    });
    executor.register({
      execute: () => Promise.resolve().then(done)
    });
    executor.start({ ignorePaused: true });
  });

  it('should execute function if timefilter is not paused and interval set to 1000ms', (done) => {
    timefilter.setRefreshInterval({
      value: 1000
    });
    executor.register({
      execute: () => Promise.resolve().then(done)
    });
    executor.start();
  });

  it('should execute function multiple times', (done) => {
    let calls = 0;
    timefilter.setRefreshInterval({
      value: 10
    });
    executor.register({ execute: () => {
      if (calls++ > 1) done();
      return Promise.resolve();
    } });
    executor.start();
  });

  it('should call handleResponse', (done) => {
    timefilter.setRefreshInterval({
      value: 10
    });
    executor.register({
      execute: () => Promise.resolve(),
      handleResponse: () => done()
    });
    executor.start();
  });

  it('should call handleError', (done) => {
    timefilter.setRefreshInterval({
      value: 10
    });
    executor.register({
      execute: () => Promise.reject(),
      handleError: () => done()
    });
    executor.start();
  });
});
