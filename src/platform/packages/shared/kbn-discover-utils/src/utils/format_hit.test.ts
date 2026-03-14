/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  dataViewMock,
  createDataViewWithBytesField,
  createFormatFieldValueSpy,
  expectFieldCallToMatch,
} from '../__mocks__';
import { formatHit } from './format_hit';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import type { DataTableRecord, EsHitRecord } from '../types';
import { buildDataTableRecord } from './build_data_record';
import { fieldList } from '@kbn/data-views-plugin/common';
import { buildDataViewMock } from '../__mocks__/data_view';

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
      (fieldName) => ['_index', 'message', 'extension', 'object.value'].includes(fieldName),
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
      (fieldName) => ['_index', 'message', 'extension', 'object.value'].includes(fieldName),
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
      (fieldName) => ['_index', 'message', 'extension', 'object.value'].includes(fieldName),
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
      (fieldName) => ['_index', 'message', 'object.value'].includes(fieldName),
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

  it('should highlight a subfield even shouldShowFieldHandler determines it should not be shown ', () => {
    const highlightHit = buildDataTableRecord(
      {
        _id: '2',
        _index: 'logs',
        fields: {
          object: ['object'],
          'object.value': [42, 13],
        },
        highlight: { 'object.value': ['%%'] },
      },
      dataViewMock
    );

    const formatted = formatHit(
      highlightHit,
      dataViewMock,
      (fieldName) => ['_index', 'object'].includes(fieldName),
      220,
      fieldFormatsMock
    );

    expect(formatted).toEqual([
      ['object.value', 'formatted:42,13', 'object.value'],
      ['object', ['object'], 'object'],
      ['_index', 'formatted:logs', '_index'],
      ['_score', undefined, '_score'],
    ]);
  });

  it('should filter fields based on their real name not displayName', () => {
    const formatted = formatHit(
      row,
      dataViewMock,
      (fieldName) => ['_index', 'bytes'].includes(fieldName),
      220,
      fieldFormatsMock
    );
    expect(formatted).toEqual([
      ['bytesDisplayName', 'formatted:123', 'bytes'],
      ['_index', 'formatted:logs', '_index'],
      ['_score', undefined, '_score'],
    ]);
  });

  describe('with enriched DataView', () => {
    let formatFieldValueSpy: jest.SpyInstance;

    beforeEach(() => {
      formatFieldValueSpy = createFormatFieldValueSpy();
    });

    afterEach(() => {
      formatFieldValueSpy.mockRestore();
    });

    it('should pass data view field to formatFieldValue', () => {
      const testDataView = createDataViewWithBytesField();
      const testHit = buildDataTableRecord(
        { _id: '1', _index: 'logs', fields: { bytes: [100] } },
        testDataView
      );

      formatHit(testHit, testDataView, () => true, 220, fieldFormatsMock);

      expectFieldCallToMatch(formatFieldValueSpy, 'bytes', 'number');
    });

    it('should pass enriched field type when DataView has different type (ES|QL mode)', () => {
      // In ES|QL mode, the DataView will be enriched with fields from query results
      const enrichedDataView = buildDataViewMock({
        name: 'test-data-view',
        fields: fieldList([
          {
            name: '_index',
            type: 'string',
            scripted: false,
            searchable: true,
            aggregatable: false,
          },
          {
            name: 'bytes',
            type: 'string',
            esTypes: ['keyword'],
            scripted: false,
            searchable: true,
            aggregatable: true,
          },
        ]),
      });
      const testHit = buildDataTableRecord(
        { _id: '1', _index: 'logs', fields: { bytes: ['100'] } },
        enrichedDataView
      );

      formatHit(testHit, enrichedDataView, () => true, 220, fieldFormatsMock);

      expectFieldCallToMatch(formatFieldValueSpy, 'bytes', 'string', ['keyword']);
    });

    it('should pass enriched field for ES|QL computed fields not in original data view', () => {
      // In ES|QL mode, the DataView will be enriched with computed fields
      const enrichedDataView = buildDataViewMock({
        name: 'test-data-view',
        fields: fieldList([
          {
            name: '_index',
            type: 'string',
            scripted: false,
            searchable: true,
            aggregatable: false,
          },
          {
            name: 'custom_esql_field',
            type: 'number',
            esTypes: ['long'],
            scripted: false,
            searchable: true,
            aggregatable: true,
          },
        ]),
      });
      const testHit = buildDataTableRecord(
        { _id: '1', _index: 'logs', fields: { custom_esql_field: [42] } },
        enrichedDataView
      );

      formatHit(testHit, enrichedDataView, () => true, 220, fieldFormatsMock);

      expectFieldCallToMatch(formatFieldValueSpy, 'custom_esql_field', 'number', ['long']);
    });
  });
});
