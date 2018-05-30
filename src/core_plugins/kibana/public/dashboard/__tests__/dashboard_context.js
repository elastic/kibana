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
import { expect } from 'chai';
import { dashboardContextProvider } from '../dashboard_context';

describe('Dashboard Context', () => {

  describe('with query bar', () => {
    let Private;
    let getAppState;
    let getDashboardContext;
    beforeEach(() => {
      Private = sinon.stub().returns({
        getFilters() {
          return [];
        }
      });
    });

    it('should return an empty must and must not when there are no filters or queries', () => {
      getAppState = sinon.stub().returns({
        query: {
          language: 'lucene',
          query: null
        }
      });
      getDashboardContext = dashboardContextProvider(Private, getAppState);
      const context = getDashboardContext();
      expect(context).to.eql({
        bool: {
          must: [],
          must_not: []
        }
      });
    });

    it('should add a valid query to must', () => {
      getAppState = sinon.stub().returns({
        query: {
          language: 'lucene',
          query: '*'
        }
      });
      getDashboardContext = dashboardContextProvider(Private, getAppState);
      const context = getDashboardContext();
      expect(context).to.eql({
        bool: {
          must: [
            {
              query_string: {
                query: '*'
              }
            }
          ],
          must_not: []
        }
      });
    });

  });

  describe('with filter bar', () => {
    let Private;
    let getAppState;
    let getDashboardContext;
    beforeEach(() => {
      getAppState = sinon.stub().returns({ query: { language: 'something-else' } });
    });

    afterEach(() => {
      getAppState.resetHistory();
    });

    it('should add a valid filter to must', () => {
      Private = sinon.stub().returns({
        getFilters() {
          return [
            { meta: { negate: false }, term: { foo: 'bar' } }
          ];
        }
      });
      getDashboardContext = dashboardContextProvider(Private, getAppState);
      const context = getDashboardContext();
      expect(context).to.eql({
        bool: {
          must: [{ term: { foo: 'bar' } }],
          must_not: []
        }
      });
    });

    it('should add a valid filter to must_not', () => {
      Private = sinon.stub().returns({
        getFilters() {
          return [
            { meta: { negate: true }, term: { foo: 'bar' } }
          ];
        }
      });
      getDashboardContext = dashboardContextProvider(Private, getAppState);
      const context = getDashboardContext();
      expect(context).to.eql({
        bool: {
          must: [],
          must_not: [{ term: { foo: 'bar' } }]
        }
      });
    });

    it('should not add a disabled filter', () => {
      Private = sinon.stub().returns({
        getFilters() {
          return [
            { meta: { negate: true, disabled: true }, term: { foo: 'bar' } }
          ];
        }
      });
      getDashboardContext = dashboardContextProvider(Private, getAppState);
      const context = getDashboardContext();
      expect(context).to.eql({
        bool: {
          must: [],
          must_not: []
        }
      });
    });

  });

});


