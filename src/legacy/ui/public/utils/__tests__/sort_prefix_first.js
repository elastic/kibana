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
import { sortPrefixFirst } from '../sort_prefix_first';

describe('sortPrefixFirst', function() {
  it('should return the original unmodified array if no prefix is provided', function() {
    const array = ['foo', 'bar', 'baz'];
    const result = sortPrefixFirst(array);
    expect(result).to.be(array);
    expect(result).to.eql(['foo', 'bar', 'baz']);
  });

  it('should sort items that match the prefix first without modifying the original array', function() {
    const array = ['foo', 'bar', 'baz'];
    const result = sortPrefixFirst(array, 'b');
    expect(result).to.not.be(array);
    expect(result).to.eql(['bar', 'baz', 'foo']);
    expect(array).to.eql(['foo', 'bar', 'baz']);
  });

  it('should not modify the order of the array other than matching prefix without modifying the original array', function() {
    const array = ['foo', 'bar', 'baz', 'qux', 'quux'];
    const result = sortPrefixFirst(array, 'b');
    expect(result).to.not.be(array);
    expect(result).to.eql(['bar', 'baz', 'foo', 'qux', 'quux']);
    expect(array).to.eql(['foo', 'bar', 'baz', 'qux', 'quux']);
  });

  it('should sort objects by property if provided', function() {
    const array = [
      { name: 'foo' },
      { name: 'bar' },
      { name: 'baz' },
      { name: 'qux' },
      { name: 'quux' },
    ];
    const result = sortPrefixFirst(array, 'b', 'name');
    expect(result).to.not.be(array);
    expect(result).to.eql([
      { name: 'bar' },
      { name: 'baz' },
      { name: 'foo' },
      { name: 'qux' },
      { name: 'quux' },
    ]);
    expect(array).to.eql([
      { name: 'foo' },
      { name: 'bar' },
      { name: 'baz' },
      { name: 'qux' },
      { name: 'quux' },
    ]);
  });

  it('should handle numbers', function() {
    const array = [1, 50, 5];
    const result = sortPrefixFirst(array, 5);
    expect(result).to.not.be(array);
    expect(result).to.eql([50, 5, 1]);
  });

  it('should handle mixed case', function() {
    const array = ['Date Histogram', 'Histogram'];
    const prefix = 'histo';
    const result = sortPrefixFirst(array, prefix);
    expect(result).to.not.be(array);
    expect(result).to.eql(['Histogram', 'Date Histogram']);
  });
});
