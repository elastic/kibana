/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataViewMock, dataViewMock } from '../__mocks__';
import { formatHit } from './format_hit';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import type { DataTableColumnsMeta, DataTableRecord, EsHitRecord } from '../types';
import { buildDataTableRecord } from './build_data_record';
import { fieldList } from '@kbn/data-views-plugin/common';
import * as formatValueModule from './format_value';

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
      fieldFormatsMock,
      undefined
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
      fieldFormatsMock,
      undefined
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
      fieldFormatsMock,
      undefined
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
      fieldFormatsMock,
      undefined
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
      fieldFormatsMock,
      undefined
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
      fieldFormatsMock,
      undefined
    );
    expect(formatted).toEqual([
      ['bytesDisplayName', 'formatted:123', 'bytes'],
      ['_index', 'formatted:logs', '_index'],
      ['_score', undefined, '_score'],
    ]);
  });

  describe('with columnsMeta', () => {
    let formatFieldValueSpy: jest.SpyInstance;

    beforeEach(() => {
      formatFieldValueSpy = jest
        .spyOn(formatValueModule, 'formatFieldValue')
        .mockReturnValue('formatted');
    });

    afterEach(() => {
      formatFieldValueSpy.mockRestore();
    });

    it('should pass data view field to formatFieldValue when columnsMeta is undefined', () => {
      const testDataView = buildDataViewMock({
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
            type: 'number',
            esTypes: ['long'],
            scripted: false,
            searchable: true,
            aggregatable: true,
          },
        ]),
      });

      const testHit = buildDataTableRecord(
        {
          _id: '1',
          _index: 'logs',
          fields: {
            bytes: [100],
          },
        },
        testDataView
      );

      formatHit(testHit, testDataView, () => true, 220, fieldFormatsMock, undefined);

      // Should pass the data view field (with type 'number') to formatFieldValue
      const bytesFieldCall = formatFieldValueSpy.mock.calls.find(
        (call) => call[4]?.name === 'bytes'
      );
      expect(bytesFieldCall).toBeDefined();
      expect(bytesFieldCall![4]).toMatchObject({
        name: 'bytes',
        type: 'number',
      });
    });

    it('should pass field with columnsMeta type to formatFieldValue when types differ', () => {
      const testDataView = buildDataViewMock({
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
            type: 'number',
            esTypes: ['long'],
            scripted: false,
            searchable: true,
            aggregatable: true,
          },
        ]),
      });

      const testHit = buildDataTableRecord(
        {
          _id: '1',
          _index: 'logs',
          fields: {
            bytes: ['100'],
          },
        },
        testDataView
      );

      const columnsMeta: DataTableColumnsMeta = {
        bytes: {
          type: 'string',
          esType: 'keyword',
        },
      };

      formatHit(testHit, testDataView, () => true, 220, fieldFormatsMock, columnsMeta);

      // Should pass a field with the columnsMeta type (string/keyword) to formatFieldValue
      const bytesFieldCall = formatFieldValueSpy.mock.calls.find(
        (call) => call[4]?.name === 'bytes'
      );
      expect(bytesFieldCall).toBeDefined();
      expect(bytesFieldCall![4]).toMatchObject({
        name: 'bytes',
        type: 'string',
        esTypes: ['keyword'],
      });
    });

    it('should pass field created from columnsMeta to formatFieldValue for fields not in data view', () => {
      const testDataView = buildDataViewMock({
        name: 'test-data-view',
        fields: fieldList([
          {
            name: '_index',
            type: 'string',
            scripted: false,
            searchable: true,
            aggregatable: false,
          },
        ]),
      });

      const testHit = buildDataTableRecord(
        {
          _id: '1',
          _index: 'logs',
          fields: {
            custom_esql_field: [42],
          },
        },
        testDataView
      );

      const columnsMeta: DataTableColumnsMeta = {
        custom_esql_field: {
          type: 'number',
          esType: 'long',
        },
      };

      formatHit(testHit, testDataView, () => true, 220, fieldFormatsMock, columnsMeta);

      // Should pass a field created from columnsMeta to formatFieldValue
      const customFieldCall = formatFieldValueSpy.mock.calls.find(
        (call) => call[4]?.name === 'custom_esql_field'
      );
      expect(customFieldCall).toBeDefined();
      expect(customFieldCall![4]).toMatchObject({
        name: 'custom_esql_field',
        type: 'number',
        esTypes: ['long'],
      });
    });
  });
});
