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
import expect from '@kbn/expect';
import ngMock from 'ng_mock';

import { SegmentedSearchRequestProvider } from '../segmented_search_request';
import { SearchRequestProvider } from '../../search_request';

describe('SegmentedSearchRequest', () => {
  let Promise;
  let SegmentedSearchRequest;
  let segmentedReq;
  let abstractReqStart;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject((Private, $injector) => {
    Promise = $injector.get('Promise');
    SegmentedSearchRequest = Private(SegmentedSearchRequestProvider);

    const SearchRequest = Private(SearchRequestProvider);
    abstractReqStart = sinon.stub(SearchRequest.prototype, 'start').callsFake(() => {
      const promise = Promise.resolve();
      sinon.spy(promise, 'then');
      return promise;
    });
  }));

  describe('#start()', () => {
    let returned;
    beforeEach(() => {
      init();
      returned = segmentedReq.start();
    });

    it('returns promise', () => {
      expect(returned.then).to.be.Function;
    });

    it('calls AbstractReq#start()', () => {
      sinon.assert.calledOnce(abstractReqStart);
    });

    it('listens to promise from super.start()', () => {
      sinon.assert.calledOnce(abstractReqStart);
      const promise = abstractReqStart.firstCall.returnValue;
      sinon.assert.calledOnce(promise.then);
    });
  });

  function init() {
    segmentedReq = new SegmentedSearchRequest({ source: mockSource(), errorHandler: () => {} });
  }

  function mockSource() {
    return {
      get: sinon.stub().returns(mockIndexPattern()),
    };
  }

  function mockIndexPattern() {
    return {
      toDetailedIndexList: sinon.stub().returns(Promise.resolve([
        { index: 1, min: 0, max: 1 },
        { index: 2, min: 0, max: 1 },
        { index: 3, min: 0, max: 1 },
      ]))
    };
  }
});
