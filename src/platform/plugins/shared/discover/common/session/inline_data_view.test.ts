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
import { generateInlineDataViewId, getDataViewSpecKey } from './inline_data_view';
import { inlineDataViewIdCases, inlineSpecWithRuntimeField } from './inline_data_view.fixtures';

describe('generateInlineDataViewId', () => {
  it.each(inlineDataViewIdCases)(
    'keeps the expected ID for %s',
    (_description, spec, expectedId) => {
      const input = cloneDeep(spec);

      expect(generateInlineDataViewId(input)).toBe(expectedId);
      expect(input).toEqual(spec);
    }
  );

  it('returns the same ID when called again with a copy of the spec', () => {
    const id = generateInlineDataViewId(inlineSpecWithRuntimeField);

    expect(generateInlineDataViewId(cloneDeep(inlineSpecWithRuntimeField))).toBe(id);
  });

  it('handles a spec with only a title, with or without explicit defaults', () => {
    const spec: DataViewSpec = { title: 'logs-*' };
    const id = generateInlineDataViewId(spec);

    expect(id).toMatch(/^discover-inline-[a-f0-9]{64}$/);
    expect(generateInlineDataViewId({ ...spec, name: 'logs-*', allowHidden: false })).toBe(id);
  });

  it.each(['', 'logs-*'])('treats the name "%s" like an omitted name', (name) => {
    expect(generateInlineDataViewId({ ...inlineSpecWithRuntimeField, name })).toBe(
      generateInlineDataViewId(inlineSpecWithRuntimeField)
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
    expect(generateInlineDataViewId({ ...inlineSpecWithRuntimeField, ...changes })).not.toBe(
      generateInlineDataViewId(inlineSpecWithRuntimeField)
    );
  });
});

describe('getDataViewSpecKey', () => {
  it('ignores the order of properties, including those inside runtime fields', () => {
    const reorderedSpec: DataViewSpec = {
      runtimeFieldMap: {
        bytes_runtime: { script: { source: 'emit(doc["bytes"].value)' }, type: 'long' },
      },
      timeFieldName: '@timestamp',
      title: 'logs-*',
    };

    expect(getDataViewSpecKey(reorderedSpec)).toBe(getDataViewSpecKey(inlineSpecWithRuntimeField));
  });

  it.each<[string, Partial<DataViewSpec>]>([
    ['local metadata', { id: 'local-id', version: 'local-version', managed: true }],
    [
      'explicit default values',
      {
        name: 'logs-*',
        allowHidden: false,
        sourceFilters: [],
        fieldFormats: {},
        fieldAttrs: {},
      },
    ],
    ['field popularity', { fieldAttrs: { bytes: { count: 3 } } }],
    ['empty field settings', { fieldAttrs: { bytes: {} } }],
  ])('ignores %s', (_description, changes) => {
    expect(getDataViewSpecKey({ ...inlineSpecWithRuntimeField, ...changes })).toBe(
      getDataViewSpecKey(inlineSpecWithRuntimeField)
    );
  });
});
