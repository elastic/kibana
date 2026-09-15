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
import { generateInlineDataViewId } from './inline_data_view';

const inlineSpec: DataViewSpec = {
  title: 'logs-*',
  timeFieldName: '@timestamp',
  runtimeFieldMap: {
    bytes_runtime: { type: 'long', script: { source: 'emit(doc["bytes"].value)' } },
  },
};

describe('generateInlineDataViewId', () => {
  it('keeps the expected ID without mutating the spec', () => {
    const input = cloneDeep(inlineSpec);

    expect(generateInlineDataViewId(input)).toBe(
      'discover-inline-6304de431ceaf4f5d9a8c49b99c634ec13a2a8a028c596c2c1d7940d8ef40731'
    );
    expect(generateInlineDataViewId(cloneDeep(inlineSpec))).toBe(generateInlineDataViewId(input));
    expect(input).toEqual(inlineSpec);
  });

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
