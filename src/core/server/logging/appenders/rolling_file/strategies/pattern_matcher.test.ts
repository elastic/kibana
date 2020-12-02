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

import { getNumericMatcher } from './numeric_pattern_matcher';

describe('getNumericIndex', () => {
  it('returns the file index when the file matches the pattern', () => {
    const matcher = getNumericMatcher('log.json', '.%i');
    expect(matcher('log.1.json')).toEqual(1);
    expect(matcher('log.12.json')).toEqual(12);
  });
  it('handles special characters in the pattern', () => {
    const matcher = getNumericMatcher('kibana.log', '-{%i}');
    expect(matcher('kibana-{1}.log')).toEqual(1);
  });
  it('returns undefined when the file does not match the pattern', () => {
    const matcher = getNumericMatcher('log.json', '.%i');
    expect(matcher('log.1.text')).toBeUndefined();
    expect(matcher('log*1.json')).toBeUndefined();
    expect(matcher('log.2foo.json')).toBeUndefined();
  });
  it('handles multiple extensions', () => {
    const matcher = getNumericMatcher('log.foo.bar', '.%i');
    expect(matcher('log.1.foo.bar')).toEqual(1);
    expect(matcher('log.12.foo.bar')).toEqual(12);
  });
  it('handles files with no extensions', () => {
    const matcher = getNumericMatcher('log', '.%i');
    expect(matcher('log.1')).toEqual(1);
    expect(matcher('log.42')).toEqual(42);
  });
});
