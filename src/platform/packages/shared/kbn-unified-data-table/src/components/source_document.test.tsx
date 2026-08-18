/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsHitRecord } from '@kbn/discover-utils/src/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React from 'react';
import { IndexPatternSource } from '@kbn/data-source';
import SourceDocument from './source_document';
import { buildDataTableRecord } from '@kbn/discover-utils';
import {
  createDataViewWithBytesField,
  createFormatFieldValueReactSpy,
  dataViewMock,
  expectFieldCallToMatch,
} from '@kbn/discover-utils/src/__mocks__';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, within } from '@testing-library/react';

const mockServices = {
  fieldFormats: {
    getDefaultInstance: jest.fn(() => ({
      convertToReact: (value: unknown) => (value ? value : '-'),
    })),
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

const dataSourceMock = new IndexPatternSource(dataViewMock);

describe('Unified data table source document cell rendering', () => {
  it('renders a description list for source type documents', () => {
    const rows = rowsSource.map(build);

    renderWithI18n(
      <SourceDocument
        columnId="_source"
        dataSource={dataSourceMock}
        fieldFormats={mockServices.fieldFormats as unknown as FieldFormatsStart}
        isPlainRecord={true}
        maxEntries={100}
        row={rows[0]}
        shouldShowFieldHandler={() => false}
        useTopLevelObjectColumns={false}
      />
    );

    const descriptionList = screen.getByTestId('discoverCellDescriptionList');
    expect(within(descriptionList).getByText('extension')).toBeVisible();
    expect(within(descriptionList).getByText('.gz')).toBeVisible();
    expect(within(descriptionList).getByText('_score')).toBeVisible();
    expect(within(descriptionList).getByText('1')).toBeVisible();
  });

  it('passes values through appropriate formatter when `useTopLevelObjectColumns` is true', () => {
    const mockConvertToReact = jest.fn((value: unknown) => `${value}`.replaceAll('foo', 'bar'));
    const mockFieldFormats = {
      getDefaultInstance: jest.fn(() => ({ convertToReact: mockConvertToReact })),
    };

    const row = build({
      _id: '1',
      _index: 'test',
      _score: 1,
      fields: {
        'foo.data': ['my foo value'],
      },
    });

    renderWithI18n(
      <SourceDocument
        columnId="foo"
        dataSource={dataSourceMock}
        fieldFormats={mockFieldFormats as unknown as FieldFormatsStart}
        isPlainRecord={true}
        maxEntries={100}
        row={row}
        shouldShowFieldHandler={() => true}
        useTopLevelObjectColumns={true}
      />
    );

    const descriptionList = screen.getByTestId('discoverCellDescriptionList');
    expect(within(descriptionList).getByText('foo.data')).toBeVisible();
    expect(within(descriptionList).getByText('my bar value')).toBeVisible();
    expect(mockConvertToReact).toHaveBeenCalled();
  });

  it('renders a dash in ES|QL mode when all field values are null', () => {
    const row = build({
      _id: '1',
      _index: 'test',
      _score: null,
      _source: { bytes: null, extension: null },
    });

    renderWithI18n(
      <SourceDocument
        columnId="_source"
        dataSource={dataSourceMock}
        fieldFormats={mockServices.fieldFormats as unknown as FieldFormatsStart}
        isPlainRecord={true}
        maxEntries={100}
        row={row}
        shouldShowFieldHandler={() => false}
        useTopLevelObjectColumns={false}
      />
    );

    expect(screen.getByText('—')).toBeVisible();
  });

  it('does not let null fields consume the ES|QL document summary limit', () => {
    const row = build({
      _id: 'doc-001',
      _source: {
        field_1: null,
        field_2: null,
        field_3: null,
        field_4: null,
        field_5: null,
        source: 'void_realm',
        status: 'missing_in_action',
      },
    });

    renderWithI18n(
      <SourceDocument
        columnId="_source"
        dataSource={dataSourceMock}
        fieldFormats={mockServices.fieldFormats as unknown as FieldFormatsStart}
        isPlainRecord={true}
        maxEntries={2}
        row={row}
        shouldShowFieldHandler={() => true}
        useTopLevelObjectColumns={false}
      />
    );

    const descriptionList = screen.getByTestId('discoverCellDescriptionList');
    expect(within(descriptionList).getByText('source')).toBeVisible();
    expect(within(descriptionList).getByText('void_realm')).toBeVisible();
    expect(within(descriptionList).getByText('status')).toBeVisible();
    expect(within(descriptionList).getByText('missing_in_action')).toBeVisible();
    expect(within(descriptionList).queryByText('field_1')).not.toBeInTheDocument();
    expect(within(descriptionList).queryByText(/and \d+ more fields/)).not.toBeInTheDocument();
  });

  describe('with a data source', () => {
    it('should use data view field type', () => {
      const formatFieldValueReactSpy = createFormatFieldValueReactSpy();
      const testDataView = createDataViewWithBytesField();

      const row = buildDataTableRecord(
        {
          _id: '1',
          _index: 'test',
          _score: 1,
          _source: { bytes: 100 },
        },
        testDataView
      );

      renderWithI18n(
        <SourceDocument
          columnId="_source"
          dataSource={new IndexPatternSource(testDataView)}
          fieldFormats={mockServices.fieldFormats as unknown as FieldFormatsStart}
          isPlainRecord={true}
          maxEntries={100}
          row={row}
          shouldShowFieldHandler={() => true}
          useTopLevelObjectColumns={false}
        />
      );

      const descriptionList = screen.getByTestId('discoverCellDescriptionList');
      expect(within(descriptionList).getByText('bytes')).toBeVisible();
      expect(within(descriptionList).getByText('_index')).toBeVisible();
      expect(within(descriptionList).getByText('_score')).toBeVisible();
      expect(within(descriptionList).getAllByText('formatted')).toHaveLength(3);
      expectFieldCallToMatch(formatFieldValueReactSpy, 'bytes', 'number');
      formatFieldValueReactSpy.mockRestore();
    });

    // NOTE: a test used to live here asserting that an ES|QL "columnsMeta" type override took
    // precedence over the data view's field type for the `_source` column. That's no longer
    // representable: `SourceDocument`'s non-top-level-object path renders via
    // `formatHitReact(row, dataView, ...)`, and `dataView` is only populated when `dataSource`
    // is an `IndexPatternSource` (see `get_field_from_data_source.ts`) — for an `EsqlSource`,
    // `dataView` is `undefined`, so there is currently no way to exercise a per-column type
    // override for the `_source` column. This is a known coverage gap; Phase 2's planned
    // `getFormatter`/`getColumnLabel` interface additions may restore equivalent coverage.
  });
});
