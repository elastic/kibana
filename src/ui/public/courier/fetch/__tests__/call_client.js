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
import expect from 'expect.js';
import ngMock from 'ng_mock';

import { CallClientProvider } from '../call_client';

function mockRequest() {
  return {
    strategy: 'mock',
    started: true,
    aborted: false,
    handleFailure: sinon.spy(),
    retry: sinon.spy(function () { return this; }),
    continue: sinon.spy(function () { return this; }),
    start: sinon.spy(function () { return this; })
  };
}

describe('callClient', () => {
  let callClient;
  let request;
  let requests;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject((Private) => {
    callClient = Private(CallClientProvider);
    request = mockRequest();
    requests = [ request ];
  }));

  it('returns a promise', () => {
    const callingClient = callClient(requests);
    expect(callingClient.then).to.be.a('function');
  });
});
