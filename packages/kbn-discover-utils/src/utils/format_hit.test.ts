/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '../__mocks__';
import { formatHit } from './format_hit';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import type { DataTableRecord, EsHitRecord } from '../types';
import { buildDataTableRecord } from './build_data_record';

describe('formatHit', () => {
  let row: DataTableRecord;
  let hit: EsHitRecord;
  beforeEach(() => {
    hit = {
      _id: '1',
      _index: 'logs',
      fields: {
        message: ['foobar'],
        extension: ['png'],
        'object.value': [42, 13],
        bytes: [123],
      },
    };
    row = buildDataTableRecord(hit, dataViewMock);
    (dataViewMock.getFormatterForField as jest.Mock).mockReturnValue({
      convert: (value: unknown) => `formatted:${value}`,
    });
  });

  it('formats a document as expected', () => {
    const formatted = formatHit(
      row,
      dataViewMock,
      (fieldName) => ['message', 'extension', 'object.value'].includes(fieldName),
      220,
      fieldFormatsMock
    );
    expect(formatted).toEqual([
      ['extension', 'formatted:png', 'extension'],
      ['message', 'formatted:foobar', 'message'],
      ['object.value', 'formatted:42,13', 'object.value'],
      ['_index', 'formatted:logs', '_index'],
      ['_score', undefined, '_score'],
    ]);
  });

  it('orders highlighted fields first', () => {
    const highlightHit = buildDataTableRecord(
      {
        ...hit,
        highlight: { message: ['%%'] },
      },
      dataViewMock
    );

    const formatted = formatHit(
      highlightHit,
      dataViewMock,
      (fieldName) => ['message', 'extension', 'object.value'].includes(fieldName),
      220,
      fieldFormatsMock
    );
    expect(formatted.map(([fieldName]) => fieldName)).toEqual([
      'message',
      'extension',
      'object.value',
      '_index',
      '_score',
    ]);
  });

  it('only limits count of pairs based on advanced setting', () => {
    const formatted = formatHit(
      row,
      dataViewMock,
      (fieldName) => ['message', 'extension', 'object.value'].includes(fieldName),
      2,
      fieldFormatsMock
    );
    expect(formatted).toEqual([
      ['extension', 'formatted:png', 'extension'],
      ['message', 'formatted:foobar', 'message'],
      ['and 3 more fields', '', null],
    ]);
  });

  it('should not include fields not mentioned in fieldsToShow', () => {
    const formatted = formatHit(
      row,
      dataViewMock,
      (fieldName) => ['message', 'object.value'].includes(fieldName),
      220,
      fieldFormatsMock
    );
    expect(formatted).toEqual([
      ['message', 'formatted:foobar', 'message'],
      ['object.value', 'formatted:42,13', 'object.value'],
      ['_index', 'formatted:logs', '_index'],
      ['_score', undefined, '_score'],
    ]);
  });

  it('should filter fields based on their real name not displayName', () => {
    const formatted = formatHit(
      row,
      dataViewMock,
      (fieldName) => ['bytes'].includes(fieldName),
      220,
      fieldFormatsMock
    );
    expect(formatted).toEqual([
      ['bytesDisplayName', 'formatted:123', 'bytes'],
      ['_index', 'formatted:logs', '_index'],
      ['_score', undefined, '_score'],
    ]);
  });
});
