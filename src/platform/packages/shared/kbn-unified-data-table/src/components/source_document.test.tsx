/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataViewMock, dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { render } from '@testing-library/react';
import React from 'react';
import SourceDocument from './source_document';
import type { DataTableColumnsMeta, EsHitRecord } from '@kbn/discover-utils/src/types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { fieldList } from '@kbn/data-views-plugin/common';
import * as formatValueModule from '@kbn/discover-utils/src/utils/format_value';

const mockServices = {
  fieldFormats: {
    getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => (value ? value : '-') })),
  },
};

const rowsSource: EsHitRecord[] = [
  {
    _id: '1',
    _index: 'test',
    _score: 1,
    _source: { bytes: 100, extension: '.gz' },
    highlight: {
      extension: ['@kibana-highlighted-field.gz@/kibana-highlighted-field'],
    },
  },
];

const build = (hit: EsHitRecord) => buildDataTableRecord(hit, dataViewMock);

describe('Unified data table source document cell rendering', function () {
  it('renders a description list for source type documents', () => {
    const rows = rowsSource.map(build);

    const component = mountWithIntl(
      <SourceDocument
        useTopLevelObjectColumns={false}
        row={rows[0]}
        dataView={dataViewMock}
        columnId="_source"
        fieldFormats={mockServices.fieldFormats as unknown as FieldFormatsStart}
        shouldShowFieldHandler={() => false}
        maxEntries={100}
        isPlainRecord={true}
        columnsMeta={undefined}
      />
    );
    expect(component.html()).toMatchInlineSnapshot(
      `"<dl class=\\"euiDescriptionList unifiedDataTable__descriptionList unifiedDataTable__cellValue css-5drddg-euiDescriptionList-inline-left-descriptionList\\" data-test-subj=\\"discoverCellDescriptionList\\" data-type=\\"inline\\"><dt class=\\"euiDescriptionList__title unifiedDataTable__descriptionListTitle css-4yy33l-euiDescriptionList__title-inline-compressed\\">extension</dt><dd class=\\"euiDescriptionList__description unifiedDataTable__descriptionListDescription css-11rdew2-euiDescriptionList__description-inline-compressed\\">.gz</dd><dt class=\\"euiDescriptionList__title unifiedDataTable__descriptionListTitle css-4yy33l-euiDescriptionList__title-inline-compressed\\">_score</dt><dd class=\\"euiDescriptionList__description unifiedDataTable__descriptionListDescription css-11rdew2-euiDescriptionList__description-inline-compressed\\">1</dd></dl>"`
    );
  });

  it('passes values through appropriate formatter when `useTopLevelObjectColumns` is true', () => {
    const mockConvert = jest.fn((value: unknown) => `${value}`.replaceAll('foo', 'bar'));
    const mockFieldFormats = {
      getDefaultInstance: jest.fn(() => ({ convert: mockConvert })),
    };
    const row = build({
      _id: '1',
      _index: 'test',
      _score: 1,
      fields: {
        'foo.data': ['my foo value'],
      },
    });
    const component = mountWithIntl(
      <SourceDocument
        useTopLevelObjectColumns={true}
        row={row}
        dataView={dataViewMock}
        columnId="foo"
        fieldFormats={mockFieldFormats as unknown as FieldFormatsStart}
        shouldShowFieldHandler={() => true}
        maxEntries={100}
        isPlainRecord={true}
        columnsMeta={undefined}
      />
    );

    expect(mockConvert).toHaveBeenCalled();
    expect(component.html()).toContain('my bar value');
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
            name: '_source',
            type: '_source',
            scripted: false,
            searchable: false,
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

      const row = buildDataTableRecord(
        {
          _id: '1',
          _index: 'test',
          _score: 1,
          _source: { bytes: 100 },
        },
        testDataView
      );

      render(
        <SourceDocument
          useTopLevelObjectColumns={false}
          row={row}
          dataView={testDataView}
          columnId="_source"
          fieldFormats={mockServices.fieldFormats as unknown as FieldFormatsStart}
          shouldShowFieldHandler={() => true}
          maxEntries={100}
          isPlainRecord={true}
          columnsMeta={undefined}
        />
      );

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
            name: '_source',
            type: '_source',
            scripted: false,
            searchable: false,
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

      const row = buildDataTableRecord(
        {
          _id: '1',
          _index: 'test',
          _score: 1,
          _source: { bytes: '100' },
        },
        testDataView
      );

      // columnsMeta overrides bytes from number to string/keyword
      const columnsMeta: DataTableColumnsMeta = {
        bytes: {
          type: 'string',
          esType: 'keyword',
        },
      };

      render(
        <SourceDocument
          useTopLevelObjectColumns={false}
          row={row}
          dataView={testDataView}
          columnId="_source"
          fieldFormats={mockServices.fieldFormats as unknown as FieldFormatsStart}
          shouldShowFieldHandler={() => true}
          maxEntries={100}
          isPlainRecord={true}
          columnsMeta={columnsMeta}
        />
      );

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
          {
            name: '_source',
            type: '_source',
            scripted: false,
            searchable: false,
            aggregatable: false,
          },
        ]),
      });

      const row = buildDataTableRecord(
        {
          _id: '1',
          _index: 'test',
          _score: 1,
          fields: {
            'custom.field': [42],
          },
        },
        testDataView
      );

      // columnsMeta provides type for a field not in the data view
      const columnsMeta: DataTableColumnsMeta = {
        'custom.field': {
          type: 'number',
          esType: 'long',
        },
      };

      render(
        <SourceDocument
          useTopLevelObjectColumns={true}
          row={row}
          dataView={testDataView}
          columnId="custom"
          fieldFormats={mockServices.fieldFormats as unknown as FieldFormatsStart}
          shouldShowFieldHandler={() => true}
          maxEntries={100}
          isPlainRecord={true}
          columnsMeta={columnsMeta}
        />
      );

      // Should pass a field created from columnsMeta to formatFieldValue
      const customFieldCall = formatFieldValueSpy.mock.calls.find(
        (call) => call[4]?.name === 'custom.field'
      );
      expect(customFieldCall).toBeDefined();
      expect(customFieldCall![4]).toMatchObject({
        name: 'custom.field',
        type: 'number',
        esTypes: ['long'],
      });
    });
  });
});
