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

import { getFileNameMatcher, getRollingFileName } from './pattern_matcher';

describe('getFileNameMatcher', () => {
  it('returns the file index when the file matches the pattern', () => {
    const matcher = getFileNameMatcher('log.json', '.%i');
    expect(matcher('log.1.json')).toEqual(1);
    expect(matcher('log.12.json')).toEqual(12);
  });
  it('handles special characters in the pattern', () => {
    const matcher = getFileNameMatcher('kibana.log', '-{%i}');
    expect(matcher('kibana-{1}.log')).toEqual(1);
  });
  it('returns undefined when the file does not match the pattern', () => {
    const matcher = getFileNameMatcher('log.json', '.%i');
    expect(matcher('log.1.text')).toBeUndefined();
    expect(matcher('log*1.json')).toBeUndefined();
    expect(matcher('log.2foo.json')).toBeUndefined();
  });
  it('handles multiple extensions', () => {
    const matcher = getFileNameMatcher('log.foo.bar', '.%i');
    expect(matcher('log.1.foo.bar')).toEqual(1);
    expect(matcher('log.12.foo.bar')).toEqual(12);
  });
  it('handles files without extension', () => {
    const matcher = getFileNameMatcher('log', '.%i');
    expect(matcher('log.1')).toEqual(1);
    expect(matcher('log.42')).toEqual(42);
  });
});

describe('getRollingFileName', () => {
  it('returns the correct file name', () => {
    expect(getRollingFileName('kibana.json', '.%i', 5)).toEqual('kibana.5.json');
    expect(getRollingFileName('log.txt', '-%i', 3)).toEqual('log-3.txt');
  });

  it('handles multiple extensions', () => {
    expect(getRollingFileName('kibana.foo.bar', '.%i', 5)).toEqual('kibana.5.foo.bar');
    expect(getRollingFileName('log.foo.bar', '-%i', 3)).toEqual('log-3.foo.bar');
  });

  it('handles files without extension', () => {
    expect(getRollingFileName('kibana', '.%i', 12)).toEqual('kibana.12');
    expect(getRollingFileName('log', '-%i', 7)).toEqual('log-7');
  });
});
