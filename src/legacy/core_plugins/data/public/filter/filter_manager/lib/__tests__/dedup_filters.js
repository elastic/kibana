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

import { dedupFilters } from '../dedup_filters';
import expect from '@kbn/expect';

describe('Filter Bar Directive', function () {
  describe('dedupFilters(existing, filters)', function () {

    it('should return only filters which are not in the existing', function () {
      const existing = [
        { range: { bytes: { from: 0, to: 1024 } } },
        { query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      const filters = [
        { range: { bytes: { from: 1024, to: 2048 } } },
        { query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      const results = dedupFilters(existing, filters);
      expect(results).to.contain(filters[0]);
      expect(results).to.not.contain(filters[1]);
    });

    it('should ignore the disabled attribute when comparing ', function () {
      const existing = [
        { range: { bytes: { from: 0, to: 1024 } } },
        { meta: { disabled: true }, query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      const filters = [
        { range: { bytes: { from: 1024, to: 2048 } } },
        { query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      const results = dedupFilters(existing, filters);
      expect(results).to.contain(filters[0]);
      expect(results).to.not.contain(filters[1]);
    });

    it('should ignore $state attribute', function () {
      const existing = [
        { range: { bytes: { from: 0, to: 1024 } } },
        { $state: { store: 'appState' }, query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      const filters = [
        { range: { bytes: { from: 1024, to: 2048 } } },
        { $state: { store: 'globalState' }, query: { match: { _term: { query: 'apache', type: 'phrase' } } } }
      ];
      const results = dedupFilters(existing, filters);
      expect(results).to.contain(filters[0]);
      expect(results).to.not.contain(filters[1]);
    });
  });
});
