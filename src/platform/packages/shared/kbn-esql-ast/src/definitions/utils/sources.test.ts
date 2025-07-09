/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { joinIndices, timeseriesIndices } from './mocks';

import { specialIndicesToSuggestions, shouldBeQuotedSource, sourceExists } from './sources';

describe('specialIndicesToSuggestions()', () => {
  test('converts join indices to suggestions', () => {
    const suggestions = specialIndicesToSuggestions(joinIndices);
    const labels = suggestions.map((s) => s.label);

    expect(labels).toEqual([
      'join_index',
      'join_index_with_alias',
      'lookup_index',
      'join_index_alias_1',
      'join_index_alias_2',
    ]);
  });

  test('converts timeseries indices to suggestions', () => {
    const suggestions = specialIndicesToSuggestions(timeseriesIndices);
    const labels = suggestions.map((s) => s.label);

    expect(labels).toEqual([
      'timeseries_index',
      'timeseries_index_with_alias',
      'time_series_index',
      'timeseries_index_alias_1',
      'timeseries_index_alias_2',
    ]);
  });
});

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

describe('sourceExists', () => {
  const mockSources = new Set(['source1', 'source2', 'source3', 'another_source']);

  // Basic single index existence
  it('should return true for an existing single source', () => {
    expect(sourceExists('source1', mockSources)).toBe(true);
  });

  it('should return false for a non-existing single source', () => {
    expect(sourceExists('nonExistentSource', mockSources)).toBe(false);
  });

  // Exclusion prefix
  it('should return true for an index starting with "-" (exclusion)', () => {
    expect(sourceExists('-sourceToExclude', mockSources)).toBe(true);
  });

  // Comma-delimited indices (all exist)
  it('should return true for comma-delimited indices where all parts exist', () => {
    expect(sourceExists('source1,source2', mockSources)).toBe(true);
  });

  it('should return true for comma-delimited indices with spaces where all parts exist', () => {
    expect(sourceExists(' source1 , source2 ', mockSources)).toBe(true);
  });

  // Comma-delimited indices (some missing)
  it('should return false for comma-delimited indices where one part is missing', () => {
    expect(sourceExists('source1,nonExistent', mockSources)).toBe(false);
  });

  it('should return false for comma-delimited indices where all parts are missing', () => {
    expect(sourceExists('nonExistent1,nonExistent2', mockSources)).toBe(false);
  });

  // ::data suffix removal
  it('should return true for an index with ::data suffix if the base source exists', () => {
    expect(sourceExists('source1::data', mockSources)).toBe(true);
  });

  it('should return false for an index with ::data suffix if the base source does not exist', () => {
    expect(sourceExists('nonExistent::data', mockSources)).toBe(false);
  });

  // ::failures suffix removal
  it('should return true for an index with ::failures suffix if the base source exists', () => {
    expect(sourceExists('source2::failures', mockSources)).toBe(true);
  });

  it('should return false for an index with ::failures suffix if the base source does not exist', () => {
    expect(sourceExists('nonExistent::failures', mockSources)).toBe(false);
  });

  // Combinations
  it('should return true for mixed valid comma-delimited indices including suffixes', () => {
    expect(sourceExists('source1::data,source3', mockSources)).toBe(true);
  });

  it('should return false for mixed comma-delimited indices with one missing and suffixes', () => {
    expect(sourceExists('source1::data,nonExistent::failures', mockSources)).toBe(false);
  });

  it('should handle empty string gracefully (false)', () => {
    expect(sourceExists('', mockSources)).toBe(false);
  });
});
