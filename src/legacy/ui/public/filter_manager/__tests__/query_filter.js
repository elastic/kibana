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

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import './_get_filters';
import './_add_filters';
import './_remove_filters';
import './_toggle_filters';
import './_invert_filters';
import './_pin_filters';
import { FilterBarQueryFilterProvider } from '../query_filter';
let queryFilter;

describe('Query Filter', function () {
  describe('Module', function () {
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (_$rootScope_, Private) {
      queryFilter = Private(FilterBarQueryFilterProvider);
    }));

    describe('module instance', function () {
      it('should use observables', function () {
        expect(queryFilter.getUpdates$).to.be.a('function');
        expect(queryFilter.getFetches$).to.be.a('function');
      });
    });

    describe('module methods', function () {
      it('should have methods for getting filters', function () {
        expect(queryFilter.getFilters).to.be.a('function');
        expect(queryFilter.getAppFilters).to.be.a('function');
        expect(queryFilter.getGlobalFilters).to.be.a('function');
      });

      it('should have methods for modifying filters', function () {
        expect(queryFilter.addFilters).to.be.a('function');
        expect(queryFilter.toggleFilter).to.be.a('function');
        expect(queryFilter.toggleAll).to.be.a('function');
        expect(queryFilter.removeFilter).to.be.a('function');
        expect(queryFilter.removeAll).to.be.a('function');
        expect(queryFilter.invertFilter).to.be.a('function');
        expect(queryFilter.invertAll).to.be.a('function');
        expect(queryFilter.pinFilter).to.be.a('function');
        expect(queryFilter.pinAll).to.be.a('function');
      });

    });

  });

  describe('Actions', function () {
  });
});
