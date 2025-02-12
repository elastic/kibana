/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { existingFields, buildFieldList } from './field_existing_utils';

describe('existingFields', () => {
  it('should remove missing fields by matching names', () => {
    expect(
      existingFields(
        [
          { name: 'a', aggregatable: true, searchable: true, type: 'string' },
          { name: 'b', aggregatable: true, searchable: true, type: 'string' },
        ],
        [
          { name: 'a', isScript: false, isMeta: false },
          { name: 'b', isScript: false, isMeta: true },
          { name: 'c', isScript: false, isMeta: false },
        ]
      )
    ).toEqual(['a', 'b']);
  });

  it('should keep scripted and runtime fields', () => {
    expect(
      existingFields(
        [{ name: 'a', aggregatable: true, searchable: true, type: 'string' }],
        [
          { name: 'a', isScript: false, isMeta: false },
          { name: 'b', isScript: true, isMeta: false },
          { name: 'c', runtimeField: { type: 'keyword' }, isMeta: false, isScript: false },
          { name: 'd', isMeta: true, isScript: false },
        ]
      )
    ).toEqual(['a', 'b', 'c']);
  });
});

describe('buildFieldList', () => {
  const indexPattern = {
    title: 'testpattern',
    type: 'type',
    typeMeta: 'typemeta',
    fields: [
      { name: 'foo', scripted: true, lang: 'painless', script: '2+2' },
      {
        name: 'runtime_foo',
        isMapped: false,
        runtimeField: { type: 'long', script: { source: '2+2' } },
      },
      { name: 'bar' },
      { name: '@bar' },
      { name: 'baz' },
      { name: '_mymeta' },
    ],
  };

  it('supports scripted fields', () => {
    const fields = buildFieldList(indexPattern as unknown as DataView, []);
    expect(fields.find((f) => f.isScript)).toMatchObject({
      isScript: true,
      name: 'foo',
      lang: 'painless',
      script: '2+2',
    });
  });

  it('supports runtime fields', () => {
    const fields = buildFieldList(indexPattern as unknown as DataView, []);
    expect(fields.find((f) => f.runtimeField)).toMatchObject({
      name: 'runtime_foo',
      runtimeField: { type: 'long', script: { source: '2+2' } },
    });
  });

  it('supports meta fields', () => {
    const fields = buildFieldList(indexPattern as unknown as DataView, ['_mymeta']);
    expect(fields.find((f) => f.isMeta)).toMatchObject({
      isScript: false,
      isMeta: true,
      name: '_mymeta',
    });
  });
});
