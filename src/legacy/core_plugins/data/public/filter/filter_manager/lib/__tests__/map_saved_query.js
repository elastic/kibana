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
import { mapSavedQuery } from '../map_saved_query';

describe('Filter Bar Directive', function () {
  describe('mapSavedQuery', function () {
    it('should return the type, key, params for a saved query filter type', function (done) {
      const filter = {
        meta: {
          type: 'savedQuery',
          key: 'foo',
          params: 'foo',
        }
      };
      mapSavedQuery(filter).then(function (result) {
        expect(result).to.have.property('key', 'foo');
        expect(result).to.have.property('type', 'savedQuery');
        expect(result).to.have.property('params', 'foo');
        done();
      });
    });

    it('should preserve the parameters added to the filter', function (done) {
      const filter = {
        meta: {
          type: 'savedQuery',
          key: 'foo',
          params: 'foo',
        }
      };
      mapSavedQuery(filter).then(function (result) {
        expect(result).to.have.property('type', 'savedQuery');
        expect(result.params).to.eql('foo');
        done();
      });
    });

    it('should not act on filters that are not saved queries', function (done) {
      const filter = { query: { match: { query: 'foo' } } };
      mapSavedQuery(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
    });
  });
});
