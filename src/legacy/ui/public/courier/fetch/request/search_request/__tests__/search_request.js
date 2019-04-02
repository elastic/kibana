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
import sinon from 'sinon';
import expect from '@kbn/expect';

import { SearchRequestProvider } from '../search_request';
import { searchRequestQueue } from '../../../../search_request_queue';

describe('ui/courier/fetch search request', () => {
  beforeEach(ngMock.module('kibana'));

  afterEach(() => {
    searchRequestQueue.removeAll();
  });

  it('throws exception when created without errorHandler', ngMock.inject((Private) => {
    const SearchReq = Private(SearchRequestProvider);

    let caughtError = false;
    try {
      new SearchReq({ source: {} });
    } catch(error) {
      caughtError = true;
    }
    expect(caughtError).to.be(true);
  }));

  describe('start', () => {
    it('calls this.source.requestIsStarting(request)', ngMock.inject((Private) => {
      const SearchReq = Private(SearchRequestProvider);

      const spy = sinon.spy(() => Promise.resolve());
      const source = { requestIsStarting: spy };

      const req = new SearchReq({ source, errorHandler: () => {} });
      expect(req.start()).to.have.property('then').a('function');
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWithExactly(spy, req);
    }));
  });

  describe('clone', () => {
    it('returns a search request with identical constructor arguments', ngMock.inject((Private) => {
      const SearchRequest = Private(SearchRequestProvider);

      const source = {};
      const errorHandler = () => {};
      const defer = {};

      const originalRequest = new SearchRequest({ source, errorHandler, defer });
      const clonedRequest = originalRequest.clone();

      expect(clonedRequest).not.to.be(originalRequest);
      expect(clonedRequest.source).to.be(source);
      expect(clonedRequest.errorHandler).to.be(errorHandler);
      expect(clonedRequest.defer).to.be(defer);
    }));

  });
});
