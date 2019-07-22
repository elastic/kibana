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
import { mapMatchAll } from '../map_match_all';

describe('ui/filter_manager/lib', function () {
  describe('mapMatchAll()', function () {
    let filter;


    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function () {
      filter = {
        match_all: {},
        meta: {
          field: 'foo',
          formattedValue: 'bar'
        }
      };
    }));

    describe('when given a filter that is not match_all', function () {
      it('filter is rejected', function (done) {
        delete filter.match_all;
        mapMatchAll(filter).catch(result => {
          expect(result).to.be(filter);
          done();
        });
      });
    });

    describe('when given a match_all filter', function () {
      let result;
      beforeEach(function (done) {
        mapMatchAll(filter).then(r => {
          result = r;
          done();
        });
      });

      it('key is set to meta field', function () {
        expect(result).to.have.property('key', filter.meta.field);
      });

      it('value is set to meta formattedValue', function () {
        expect(result).to.have.property('value', filter.meta.formattedValue);
      });
    });
  });
});
