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

import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import sinon from 'sinon';

import { searchRequestQueue } from '../search_request_queue';

describe('Courier Request Queue', function() {
  beforeEach(ngMock.module('kibana'));
  beforeEach(() => searchRequestQueue.removeAll());
  after(() => searchRequestQueue.removeAll());

  class MockReq {
    constructor(startable = true) {
      this.source = {};
      this.canStart = sinon.stub().returns(startable);
    }
  }

  describe('#getStartable()', function() {
    it('returns only startable requests', function() {
      searchRequestQueue.add(new MockReq(false));
      searchRequestQueue.add(new MockReq(true));
      expect(searchRequestQueue.getStartable()).to.have.length(1);
    });
  });

  // Note: I'm not convinced this discrepancy between how we calculate startable vs inactive requests makes any sense.
  // I'm only testing here that the current, (very old) code continues to behave how it always did, but it may turn out
  // that we can clean this up, or remove this.
  describe('#getInactive()', function() {
    it('returns only requests with started = false', function() {
      searchRequestQueue.add({ started: true });
      searchRequestQueue.add({ started: false });
      searchRequestQueue.add({ started: true });
      expect(searchRequestQueue.getInactive()).to.have.length(1);
    });
  });
});
