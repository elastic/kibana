/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import {
  generateInlineDataViewId,
  getDataViewSpecKey,
  normalizeInlineDataViewForByValuePersistence,
} from './inline_data_view';
import { inlineDataViewIdCases, inlineSpec } from './inline_data_view.fixtures';

describe('generateInlineDataViewId', () => {
  it.each(inlineDataViewIdCases)(
    'keeps the expected ID for %s',
    (_description, spec, expectedId) => {
      const input = cloneDeep(spec);

      expect(generateInlineDataViewId(input)).toBe(expectedId);
      expect(generateInlineDataViewId(cloneDeep(spec))).toBe(expectedId);
      expect(input).toEqual(spec);
    }
  );

  it('ignores key order, local metadata and explicit defaults', () => {
    const equivalentSpec: DataViewSpec = {
      runtimeFieldMap: {
        bytes_runtime: { script: { source: 'emit(doc["bytes"].value)' }, type: 'long' },
      },
      timeFieldName: '@timestamp',
      title: 'logs-*',
      id: 'local-id',
      allowHidden: false,
      sourceFilters: [],
      fieldFormats: {},
      fieldAttrs: { bytes: { count: 3 } },
      version: 'local-version',
      managed: true,
    };

    expect(generateInlineDataViewId(equivalentSpec)).toBe(generateInlineDataViewId(inlineSpec));
    expect(getDataViewSpecKey(equivalentSpec)).toBe(getDataViewSpecKey(inlineSpec));
  });

  it.each<[string, DataViewSpec]>([
    ['popularity', { ...inlineSpec, fieldAttrs: { bytes: { count: 3 } } }],
    ['empty field settings', { ...inlineSpec, fieldAttrs: { bytes: {} } }],
  ])('uses the same canonical key when only %s differs', (_description, spec) => {
    expect(getDataViewSpecKey(spec)).toBe(getDataViewSpecKey(inlineSpec));
  });

  it.each(['', 'logs-*'])('treats the name "%s" like an omitted name', (name) => {
    expect(generateInlineDataViewId({ ...inlineSpec, name })).toBe(
      generateInlineDataViewId(inlineSpec)
    );
  });

  it.each<[string, Partial<DataViewSpec>]>([
    ['pattern', { title: 'other-logs-*' }],
    ['time field', { timeFieldName: 'event.created' }],
    ['name', { name: 'Other logs' }],
    ['hidden indices', { allowHidden: true }],
    ['field filters', { sourceFilters: [{ value: 'secret.*' }] }],
    ['field label', { fieldAttrs: { bytes: { customLabel: 'Bytes transferred' } } }],
    ['field format', { fieldFormats: { bytes: { id: 'number', params: { pattern: '0.00' } } } }],
    [
      'runtime script',
      {
        runtimeFieldMap: {
          bytes_runtime: { type: 'long', script: { source: 'emit(doc["bytes"].value * 2)' } },
        },
      },
    ],
  ])('changes the ID when the %s changes', (_field, changes) => {
    expect(generateInlineDataViewId({ ...inlineSpec, ...changes })).not.toBe(
      generateInlineDataViewId(inlineSpec)
    );
  });
});

describe('normalizeInlineDataViewForByValuePersistence', () => {
  it('normalizes the inline spec and only its matching filter references', () => {
    const runtimeDataViewId = 'runtime-inline-id';
    const searchSource = {
      index: { ...inlineSpec, id: runtimeDataViewId },
      filter: [
        {
          meta: { index: runtimeDataViewId, key: 'bytes' },
          query: { match_phrase: { bytes: 100 } },
        },
        {
          meta: { index: 'another-data-view', key: 'service.name' },
          query: { match_phrase: { 'service.name': 'checkout' } },
        },
        {
          meta: { key: 'bytes' },
          query: { match_phrase: { bytes: 200 } },
        },
      ],
    };
    const original = cloneDeep(searchSource);
    const stableDataViewId = generateInlineDataViewId(inlineSpec);

    const normalized = normalizeInlineDataViewForByValuePersistence(searchSource);

    expect(normalized).toHaveProperty('index.id', stableDataViewId);
    expect(normalized).toHaveProperty('filter.0.meta.index', stableDataViewId);
    expect(normalized).toHaveProperty('filter.1.meta.index', 'another-data-view');
    expect(normalized).not.toHaveProperty('filter.2.meta.index');
    expect(searchSource).toEqual(original);
    expect(normalizeInlineDataViewForByValuePersistence(normalized)).toBe(normalized);
  });

  it('does not infer a filter relationship when the inline spec has no ID', () => {
    const searchSource = {
      index: inlineSpec,
      filter: [
        {
          meta: { index: 'unknown-data-view', key: 'bytes' },
          query: { match_phrase: { bytes: 100 } },
        },
      ],
    };

    expect(normalizeInlineDataViewForByValuePersistence(searchSource)).toBe(searchSource);
  });
});
