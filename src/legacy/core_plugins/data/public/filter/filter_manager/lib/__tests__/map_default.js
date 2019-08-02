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
import { mapDefault } from '../map_default';

describe('Filter Bar Directive', function () {
  describe('mapDefault()', function () {

    it('should return the key and value for matching filters', function (done) {
      const filter = { query: { match_all: {} } };
      mapDefault(filter).then(function (result) {
        expect(result).to.have.property('key', 'query');
        expect(result).to.have.property('value', '{"match_all":{}}');
        done();
      });
    });

    it('should work with undefined filter types', function (done) {
      const filter = {
        'bool': {
          'must': {
            'term': {
              'geo.src': 'US'
            }
          }
        }
      };
      mapDefault(filter).then(function (result) {
        expect(result).to.have.property('key', 'bool');
        expect(result).to.have.property('value', JSON.stringify(filter.bool));
        done();
      });
    });

    it('should return undefined if there is no valid key', function (done) {
      const filter = { meta: {} };
      mapDefault(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
    });


  });
});
