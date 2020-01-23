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

import { parseCommaSeparatedList } from '../comma_separated_list';

describe('utils parseCommaSeparatedList()', () => {
  it('supports non-string values', () => {
    expect(parseCommaSeparatedList(0)).to.eql([]);
    expect(parseCommaSeparatedList(1)).to.eql(['1']);
    expect(parseCommaSeparatedList({})).to.eql(['[object Object]']);
    expect(parseCommaSeparatedList(() => {})).to.eql(['() => {}']);
    expect(parseCommaSeparatedList((a, b) => b)).to.eql(['(a', 'b) => b']);
    expect(parseCommaSeparatedList(/foo/)).to.eql(['/foo/']);
    expect(parseCommaSeparatedList(null)).to.eql([]);
    expect(parseCommaSeparatedList(undefined)).to.eql([]);
    expect(parseCommaSeparatedList(false)).to.eql([]);
    expect(parseCommaSeparatedList(true)).to.eql(['true']);
  });

  it('returns argument untouched if it is an array', () => {
    const inputs = [[], [1], ['foo,bar']];
    for (const input of inputs) {
      const json = JSON.stringify(input);
      expect(parseCommaSeparatedList(input)).to.be(input);
      expect(json).to.be(JSON.stringify(input));
    }
  });

  it('trims whitespace around elements', () => {
    expect(parseCommaSeparatedList('1 ,    2,    3     ,    4')).to.eql(['1', '2', '3', '4']);
  });

  it('ignored empty elements between multiple commas', () => {
    expect(parseCommaSeparatedList('foo , , ,,,,, ,      ,bar')).to.eql(['foo', 'bar']);
  });
});
