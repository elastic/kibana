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
import expect from 'expect.js';

import HitSortFnProv from 'plugins/kibana/discover/_hit_sort_fn';
import NoDigestPromises from 'test_utils/no_digest_promises';
import StubbedSearchSourceProvider from 'fixtures/stubbed_search_source';

import { SegmentedRequestProvider } from '../segmented';

describe('Segmented Request Size Picking', function () {
  let SegmentedReq;
  let MockSource;
  let HitSortFn;

  NoDigestPromises.activateForSuite();

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((Private, $injector) => {
    HitSortFn = Private(HitSortFnProv);
    SegmentedReq = Private(SegmentedRequestProvider);

    MockSource = class {
      constructor() {
        return $injector.invoke(StubbedSearchSourceProvider);
      }
    };
  }));

  describe('without a size', function () {
    it('does not set the request size', async function () {
      const req = new SegmentedReq(new MockSource());
      req._handle.setDirection('desc');
      req._handle.setSortFn(new HitSortFn('desc'));
      await req.start();

      expect((await req.getFetchParams()).body).to.not.have.property('size');
    });
  });

  describe('with a size', function () {
    it('sets the request size to the entire desired size', async function () {
      const req = new SegmentedReq(new MockSource());
      req._handle.setDirection('desc');
      req._handle.setSize(555);
      req._handle.setSortFn(new HitSortFn('desc'));
      await req.start();

      expect((await req.getFetchParams()).body).to.have.property('size', 555);
    });
  });
});
