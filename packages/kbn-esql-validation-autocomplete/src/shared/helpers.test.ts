/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shouldBeQuotedSource } from './helpers';

describe('shouldBeQuotedSource', () => {
  it('does not have to be quoted for sources with acceptable characters @-+$', () => {
    expect(shouldBeQuotedSource('foo')).toBe(false);
    expect(shouldBeQuotedSource('123-test@foo_bar+baz1')).toBe(false);
    expect(shouldBeQuotedSource('my-index*')).toBe(false);
    expect(shouldBeQuotedSource('my-index$')).toBe(false);
    expect(shouldBeQuotedSource('.my-index$')).toBe(false);
  });
  it(`should be quoted if containing any of special characters [:"=|,[\]/ \t\r\n]`, () => {
    expect(shouldBeQuotedSource('foo\ttest')).toBe(true);
    expect(shouldBeQuotedSource('foo\rtest')).toBe(true);
    expect(shouldBeQuotedSource('foo\ntest')).toBe(true);
    expect(shouldBeQuotedSource('foo:test=bar')).toBe(true);
    expect(shouldBeQuotedSource('foo|test=bar')).toBe(true);
    expect(shouldBeQuotedSource('foo[test]=bar')).toBe(true);
    expect(shouldBeQuotedSource('foo/test=bar')).toBe(true);
    expect(shouldBeQuotedSource('foo test=bar')).toBe(true);
    expect(shouldBeQuotedSource('foo,test-*,abc')).toBe(true);
    expect(shouldBeQuotedSource('foo, test-*, abc, xyz')).toBe(true);
    expect(shouldBeQuotedSource('foo, test-*, abc, xyz,test123')).toBe(true);
    expect(shouldBeQuotedSource('foo,test,xyz')).toBe(true);
    expect(
      shouldBeQuotedSource('<logstash-{now/M{yyyy.MM}}>,<logstash-{now/d{yyyy.MM.dd|+12:00}}>')
    ).toBe(true);
    expect(shouldBeQuotedSource('`backtick`,``multiple`back``ticks```')).toBe(true);
    expect(shouldBeQuotedSource('test,metadata,metaata,.metadata')).toBe(true);
    expect(shouldBeQuotedSource('cluster:index')).toBe(true);
    expect(shouldBeQuotedSource('cluster:index|pattern')).toBe(true);
    expect(shouldBeQuotedSource('cluster:.index')).toBe(true);
    expect(shouldBeQuotedSource('cluster*:index*')).toBe(true);
    expect(shouldBeQuotedSource('cluster*:*')).toBe(true);
    expect(shouldBeQuotedSource('*:index*')).toBe(true);
    expect(shouldBeQuotedSource('*:index|pattern')).toBe(true);
    expect(shouldBeQuotedSource('*:*')).toBe(true);
    expect(shouldBeQuotedSource('*:*,cluster*:index|pattern,i|p')).toBe(true);
    expect(shouldBeQuotedSource('index-[dd-mm]')).toBe(true);
  });
});
