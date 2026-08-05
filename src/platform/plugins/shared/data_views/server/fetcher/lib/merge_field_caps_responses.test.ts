/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { mergeFieldCapsResponses } from './merge_field_caps_responses';
import { readFieldCapsResponse } from './field_capabilities/field_caps_response';

const keywordCap = (
  overrides: Partial<estypes.FieldCapsFieldCapability> = {}
): estypes.FieldCapsFieldCapability => ({
  type: 'keyword',
  searchable: true,
  aggregatable: true,
  ...overrides,
});

describe('mergeFieldCapsResponses()', () => {
  it('unions and dedupes indices across responses', () => {
    const merged = mergeFieldCapsResponses([
      { indices: ['a', 'b'], fields: {} },
      { indices: ['b', 'c'], fields: {} },
    ]);
    expect(merged.indices).toEqual(['a', 'b', 'c']);
  });

  it('merges disjoint fields from different batches untouched', () => {
    const merged = mergeFieldCapsResponses([
      { indices: ['a'], fields: { foo: { keyword: keywordCap() } } },
      { indices: ['b'], fields: { bar: { keyword: keywordCap() } } },
    ]);
    expect(merged.fields).toEqual({
      foo: { keyword: keywordCap() },
      bar: { keyword: keywordCap() },
    });
  });

  it('dedupes the same field/type/booleans seen in multiple batches', () => {
    const merged = mergeFieldCapsResponses([
      { indices: ['a'], fields: { foo: { keyword: keywordCap() } } },
      { indices: ['b'], fields: { foo: { keyword: keywordCap() } } },
    ]);
    const fields = readFieldCapsResponse(merged);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      name: 'foo',
      type: 'string',
      searchable: true,
      aggregatable: true,
    });
  });

  it('flags a field as "conflict" when batches disagree on its ES type, like a real single call would', () => {
    const merged = mergeFieldCapsResponses([
      { indices: ['a'], fields: { foo: { keyword: keywordCap() } } },
      {
        indices: ['b'],
        fields: { foo: { long: { type: 'long', searchable: true, aggregatable: true } } },
      },
    ]);
    const fields = readFieldCapsResponse(merged);
    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe('conflict');
    expect(fields[0].esTypes).toEqual(['keyword', 'long']);
  });

  it('treats a field as searchable overall when only some batches report it searchable (optimistic rule)', () => {
    const merged = mergeFieldCapsResponses([
      { indices: ['a'], fields: { foo: { keyword: keywordCap({ searchable: true }) } } },
      { indices: ['b'], fields: { foo: { keyword: keywordCap({ searchable: false }) } } },
    ]);
    const fields = readFieldCapsResponse(merged);
    expect(fields[0].searchable).toBe(true);
  });

  it('treats a field as non-aggregatable only when uniformly non-aggregatable across all batches', () => {
    const merged = mergeFieldCapsResponses([
      { indices: ['a'], fields: { foo: { keyword: keywordCap({ aggregatable: false }) } } },
      { indices: ['b'], fields: { foo: { keyword: keywordCap({ aggregatable: false }) } } },
    ]);
    const fields = readFieldCapsResponse(merged);
    expect(fields[0].aggregatable).toBe(false);
  });

  it('unions meta.unit across batches rather than picking one side', () => {
    const merged = mergeFieldCapsResponses([
      {
        indices: ['a'],
        fields: { bytes: { long: keywordCap({ type: 'long', meta: { unit: ['byte'] } }) } },
      },
      {
        indices: ['b'],
        fields: { bytes: { long: keywordCap({ type: 'long', meta: { unit: ['byte'] } }) } },
      },
    ]);
    // both batches agree on "byte" -> a real single call would have produced a formatter
    const fields = readFieldCapsResponse(merged);
    expect(fields[0].defaultFormatter).toBe('byte');
  });

  it('drops the formatter when batches disagree on meta.unit, matching a real mixed-unit call', () => {
    const merged = mergeFieldCapsResponses([
      {
        indices: ['a'],
        fields: { bytes: { long: keywordCap({ type: 'long', meta: { unit: ['byte'] } }) } },
      },
      {
        indices: ['b'],
        fields: { bytes: { long: keywordCap({ type: 'long', meta: { unit: ['percent'] } }) } },
      },
    ]);
    const fields = readFieldCapsResponse(merged);
    expect(fields[0].defaultFormatter).toBeUndefined();
  });

  it('drops time_series_metric when batches disagree, rather than arbitrarily picking one', () => {
    const merged = mergeFieldCapsResponses([
      {
        indices: ['a'],
        fields: {
          count: { long: keywordCap({ type: 'long', time_series_metric: 'counter' }) },
        },
      },
      {
        indices: ['b'],
        fields: {
          count: { long: keywordCap({ type: 'long', time_series_metric: 'gauge' }) },
        },
      },
    ]);
    const fields = readFieldCapsResponse(merged);
    expect(fields[0].timeSeriesMetric).toBeUndefined();
  });

  it('keeps time_series_metric when every batch agrees', () => {
    const merged = mergeFieldCapsResponses([
      {
        indices: ['a'],
        fields: {
          count: { long: keywordCap({ type: 'long', time_series_metric: 'counter' }) },
        },
      },
      {
        indices: ['b'],
        fields: {
          count: { long: keywordCap({ type: 'long', time_series_metric: 'counter' }) },
        },
      },
    ]);
    const fields = readFieldCapsResponse(merged);
    expect(fields[0].timeSeriesMetric).toBe('counter');
  });

  it('merges the per-type indices list used for conflict descriptions', () => {
    const merged = mergeFieldCapsResponses([
      { indices: ['a'], fields: { foo: { keyword: keywordCap({ indices: ['a'] }) } } },
      { indices: ['b'], fields: { foo: { keyword: keywordCap({ indices: ['b'] }) } } },
    ]);
    expect(merged.fields.foo.keyword.indices).toEqual(['a', 'b']);
  });

  it('returns an empty response for an empty input array', () => {
    expect(mergeFieldCapsResponses([])).toEqual({ indices: [], fields: {} });
  });
});
