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

import StubbedSearchSourceProvider from 'fixtures/stubbed_search_source';

import { SegmentedSearchRequestProvider } from '../segmented_search_request';

describe('SegmentedSearchRequest _createQueue', () => {
  let Promise;
  let SegmentedSearchRequest;
  let MockSource;

  require('test_utils/no_digest_promises').activateForSuite();

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((Private, $injector) => {
    Promise = $injector.get('Promise');
    SegmentedSearchRequest = Private(SegmentedSearchRequestProvider);

    MockSource = class {
      constructor() {
        return $injector.invoke(StubbedSearchSourceProvider);
      }
    };
  }));

  it('manages the req._queueCreated flag', async function () {
    const req = new SegmentedSearchRequest({ source: new MockSource(), errorHandler: () => {} });
    req._queueCreated = null;

    const promise = req._createQueue();
    expect(req._queueCreated).to.be(false);
    await promise;
    expect(req._queueCreated).to.be(true);
  });

  it('relies on indexPattern.toDetailedIndexList to generate queue', async function () {
    const searchSource = new MockSource();
    const indexPattern = searchSource.getField('index');
    const indices = [1, 2, 3];
    sinon.stub(indexPattern, 'toDetailedIndexList').returns(Promise.resolve(indices));

    const req = new SegmentedSearchRequest({ source: searchSource, errorHandler: () => {} });
    const output = await req._createQueue();
    expect(output).to.equal(indices);
  });

  it('tells the index pattern its direction', async function () {
    const searchSource = new MockSource();
    const indexPattern = searchSource.getField('index');
    const req = new SegmentedSearchRequest({ source: searchSource, errorHandler: () => {} });
    sinon.stub(indexPattern, 'toDetailedIndexList').returns(Promise.resolve([1, 2, 3]));

    req.setDirection('asc');
    await req._createQueue();
    expect(indexPattern.toDetailedIndexList.lastCall.args[2]).to.be('asc');

    req.setDirection('desc');
    await req._createQueue();
    expect(indexPattern.toDetailedIndexList.lastCall.args[2]).to.be('desc');
  });
});
