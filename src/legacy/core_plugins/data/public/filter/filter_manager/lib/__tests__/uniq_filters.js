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

import { uniqFilters } from '../uniq_filters';
import expect from '@kbn/expect';

describe('Filter Bar Directive', function () {
  describe('uniqFilter', function () {

    it('should filter out dups', function () {
      const before = [
        { query: { _type: { match: { query: 'apache', type: 'phrase' } } } },
        { query: { _type: { match: { query: 'apache', type: 'phrase' } } } }
      ];
      const results = uniqFilters(before);
      expect(results).to.have.length(1);
    });

    it('should filter out duplicates, ignoring meta attributes', function () {
      const before = [
        {
          meta: { negate: true },
          query: { _type: { match: { query: 'apache', type: 'phrase' } } }
        },
        {
          meta: { negate: false },
          query: { _type: { match: { query: 'apache', type: 'phrase' } } }
        }
      ];
      const results = uniqFilters(before);
      expect(results).to.have.length(1);
    });

    it('should filter out duplicates, ignoring $state attributes', function () {
      const before = [
        {
          $state: { store: 'appState' },
          query: { _type: { match: { query: 'apache', type: 'phrase' } } }
        },
        {
          $state: { store: 'globalState' },
          query: { _type: { match: { query: 'apache', type: 'phrase' } } }
        }
      ];
      const results = uniqFilters(before);
      expect(results).to.have.length(1);
    });
  });
});
