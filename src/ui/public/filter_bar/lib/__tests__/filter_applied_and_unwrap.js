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

import expect from 'expect.js';
import { filterAppliedAndUnwrap } from '../filter_applied_and_unwrap';

describe('Filter Bar Directive', function () {
  describe('filterAppliedAndUnwrap()', function () {

    const filters = [
      { meta: { apply: true }, exists: { field: '_type' } },
      { meta: { apply: false }, query: { query_string: { query: 'foo:bar' } } }
    ];

    it('should filter the applied and unwrap the filter', function () {
      const results = filterAppliedAndUnwrap(filters);
      expect(results).to.have.length(1);
      expect(results[0]).to.eql(filters[0]);
    });

  });
});
