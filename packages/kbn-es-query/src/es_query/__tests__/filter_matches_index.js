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
import { filterMatchesIndex } from '../filter_matches_index';

describe('filterMatchesIndex', function() {
  it('should return true if the filter has no meta', () => {
    const filter = {};
    const indexPattern = { id: 'foo', fields: [{ name: 'bar' }] };
    expect(filterMatchesIndex(filter, indexPattern)).to.be(true);
  });

  it('should return true if no index pattern is passed', () => {
    const filter = { meta: { index: 'foo', key: 'bar' } };
    const indexPattern = undefined;
    expect(filterMatchesIndex(filter, indexPattern)).to.be(true);
  });

  it('should return true if the filter key matches a field name', () => {
    const filter = { meta: { index: 'foo', key: 'bar' } };
    const indexPattern = { id: 'foo', fields: [{ name: 'bar' }] };
    expect(filterMatchesIndex(filter, indexPattern)).to.be(true);
  });

  it('should return false if the filter key does not match a field name', () => {
    const filter = { meta: { index: 'foo', key: 'baz' } };
    const indexPattern = { id: 'foo', fields: [{ name: 'bar' }] };
    expect(filterMatchesIndex(filter, indexPattern)).to.be(false);
  });
});
