/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mock Monaco editor
jest.mock('@kbn/monaco', () => ({
  monaco: {
    editor: {
      create: jest.fn(),
      defineTheme: jest.fn(),
      setTheme: jest.fn(),
    },
    languages: {
      register: jest.fn(),
      setMonarchTokensProvider: jest.fn(),
      setLanguageConfiguration: jest.fn(),
    },
  },
  XJsonLang: 'json',
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { getRenderCellValueFn } from './get_render_cell_value';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { CodeEditorProps } from '@kbn/code-editor';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: (props: CodeEditorProps) => (
    <input
      data-test-subj={'mockCodeEditor'}
      data-value={props.value}
      value={props.value}
      onChange={jest.fn()}
    />
  ),
}));

const mockServices = {
  settings: {
    client: {
      get: (key: string) => key === 'discover:maxDocFieldsDisplayed' && 200,
    },
  },
  uiSettings: {
    get: (key: string) => key === 'discover:maxDocFieldsDisplayed' && 200,
  },
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

const rowsSourceWithEmptyValues: EsHitRecord[] = [
  {
    _id: '1',
    _index: 'test',
    _score: 1,
    _source: { bytes: 100, extension: null },
    highlight: {
      extension: ['@kibana-highlighted-field.gz@/kibana-highlighted-field'],
    },
  },
];

const rowsFields: EsHitRecord[] = [
  {
    _id: '1',
    _index: 'test',
    _score: 1,
    _source: undefined,
    fields: { bytes: [100], extension: ['.gz'] },
    highlight: {
      extension: ['@kibana-highlighted-field.gz@/kibana-highlighted-field'],
    },
  },
];

const rowsFieldsWithTopLevelObject: EsHitRecord[] = [
  {
    _id: '1',
    _index: 'test',
    _score: 1,
    _source: undefined,
    fields: { 'object.value': [100], extension: ['.gz'] },
    highlight: {
      extension: ['@kibana-highlighted-field.gz@/kibana-highlighted-field'],
    },
  },
];

const build = (hit: EsHitRecord) => buildDataTableRecord(hit, dataViewMock);

describe('Unified data table cell rendering', function () {
  it('renders bytes column correctly', async () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByText } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="bytes"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByText('100')).toBeInTheDocument();
  });

  it('renders bytes column correctly using _source when details is true', async () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByText } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="bytes"
        isDetails={true}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByText('100')).toBeInTheDocument();
  });

  it('renders bytes column correctly using fields when details is true', async () => {
    const closePopoverMockFn = jest.fn();
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFields.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: closePopoverMockFn,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByText, getByTestId } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="bytes"
        isDetails={true}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByText('100')).toBeInTheDocument();
    const closeButton = getByTestId('docTableClosePopover');
    fireEvent.click(closeButton);
    expect(closePopoverMockFn).toHaveBeenCalledTimes(1);
  });

  it('renders _source column correctly', async () => {
    const showFieldHandler = (fieldName: string) => ['extension', 'bytes'].includes(fieldName);
    const rows = rowsSource.map(build);
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows,
      shouldShowFieldHandler: showFieldHandler,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByTestId } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="_source"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByTestId('discoverCellDescriptionList')).toBeInTheDocument();
  });

  it('renders _source column correctly when isDetails is set to true', async () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByTestId } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="_source"
        isDetails={true}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByTestId('dataTableExpandCellActionJsonPopover')).toBeInTheDocument();
  });

  it('renders _source column correctly if on text based mode and have nulls', async () => {
    const rows = rowsSourceWithEmptyValues.map(build);
    const showFieldHandler = (fieldName: string) => ['extension', 'bytes'].includes(fieldName);
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows,
      shouldShowFieldHandler: showFieldHandler,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      isPlainRecord: true,
      columnsMeta: undefined,
    });
    const { getByTestId } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="_source"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByTestId('discoverCellDescriptionList')).toBeInTheDocument();
  });

  it('renders fields-based column correctly', async () => {
    const rows = rowsFields.map(build);
    const showFieldHandler = (fieldName: string) => ['extension', 'bytes'].includes(fieldName);
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows,
      shouldShowFieldHandler: showFieldHandler,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByTestId } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="_source"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByTestId('discoverCellDescriptionList')).toBeInTheDocument();
  });

  it('limits amount of rendered items', async () => {
    const rows = rowsFields.map(build);
    const showFieldHandler = (fieldName: string) => ['extension', 'bytes'].includes(fieldName);
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows,
      shouldShowFieldHandler: showFieldHandler,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 1,
      columnsMeta: undefined,
    });
    const { getByTestId } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="_source"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByTestId('discoverCellDescriptionList')).toBeInTheDocument();
  });

  it('renders fields-based column correctly when isDetails is set to true', async () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFields.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByTestId } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="_source"
        isDetails={true}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByTestId('dataTableExpandCellActionJsonPopover')).toBeInTheDocument();
  });

  it('collect object fields and renders them like _source', async () => {
    const showFieldHandler = (fieldName: string) =>
      ['object.value', 'extension', 'bytes'].includes(fieldName);
    const rows = rowsFieldsWithTopLevelObject.map(build);
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows,
      shouldShowFieldHandler: showFieldHandler,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByTestId } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="object"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByTestId('discoverCellDescriptionList')).toBeInTheDocument();
  });

  it('collect object fields and renders them like _source with fallback for unmapped', async () => {
    (dataViewMock.getFieldByName as jest.Mock).mockReturnValueOnce(undefined);
    const showFieldHandler = (fieldName: string) =>
      ['extension', 'bytes', 'object.value'].includes(fieldName);
    const rows = rowsFieldsWithTopLevelObject.map(build);
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows,
      shouldShowFieldHandler: showFieldHandler,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByTestId } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="object"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByTestId('discoverCellDescriptionList')).toBeInTheDocument();
  });

  it('collect object fields and renders them as json in details', async () => {
    const closePopoverMockFn = jest.fn();
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFieldsWithTopLevelObject.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: closePopoverMockFn,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByTestId } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="object"
        isDetails={true}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByTestId('dataTableExpandCellActionJsonPopover')).toBeInTheDocument();
    const closeButton = getByTestId('docTableClosePopover');
    fireEvent.click(closeButton);
    expect(closePopoverMockFn).toHaveBeenCalledTimes(1);
  });

  it('renders a functional close button when CodeEditor is rendered', async () => {
    const closePopoverMockFn = jest.fn();
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFieldsWithTopLevelObject.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: closePopoverMockFn,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByTestId } = render(
      <KibanaContextProvider services={mockServices}>
        <DataTableCellValue
          rowIndex={0}
          colIndex={0}
          columnId="object"
          isDetails={true}
          isExpanded={false}
          isExpandable={true}
          setCellProps={jest.fn()}
        />
      </KibanaContextProvider>
    );
    const closeButton = getByTestId('docTableClosePopover');
    fireEvent.click(closeButton);
    expect(closePopoverMockFn).toHaveBeenCalledTimes(1);
  });

  it('does not collect subfields when the the column is unmapped but part of fields response', async () => {
    (dataViewMock.getFieldByName as jest.Mock).mockReturnValueOnce(undefined);
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFieldsWithTopLevelObject.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByText } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="object.value"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByText('100')).toBeInTheDocument();
  });

  it('renders correctly when invalid row is given', async () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByText } = render(
      <DataTableCellValue
        rowIndex={1}
        colIndex={1}
        columnId="bytes"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByText('-')).toBeInTheDocument();
  });

  it('renders correctly when invalid column is given', async () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByText } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="bytes-invalid"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByText('-')).toBeInTheDocument();
  });

  it('renders unmapped fields correctly', async () => {
    (dataViewMock.getFieldByName as jest.Mock).mockReturnValueOnce(undefined);
    const rowsFieldsUnmapped: EsHitRecord[] = [
      {
        _id: '1',
        _index: 'test',
        _score: 1,
        _source: undefined,
        fields: { unmapped: ['.gz'] },
        highlight: {
          extension: ['@kibana-highlighted-field.gz@/kibana-highlighted-field'],
        },
      },
    ];
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFieldsUnmapped.map(build),
      shouldShowFieldHandler: (fieldName: string) => ['unmapped'].includes(fieldName),
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const { getByText } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="unmapped"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByText('.gz')).toBeInTheDocument();
  });

  it('renders custom ES|QL fields correctly', async () => {
    jest.spyOn(dataViewMock.fields, 'create');

    const rows: EsHitRecord[] = [
      {
        _id: '1',
        _index: 'test',
        _score: 1,
        _source: undefined,
        fields: { var0: ['gif'], extension: ['.gz'], bytes: [100] },
      },
    ];

    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rows.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: {
        // custom ES|QL var
        var0: { type: 'number' },
      },
    });

    // Test var0 field
    const { getByText } = render(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="var0"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(getByText('gif')).toBeInTheDocument();

    expect(dataViewMock.fields.create).toHaveBeenCalledWith({
      name: 'var0',
      type: 'number',
      esTypes: undefined,
      searchable: true,
      aggregatable: false,
      isNull: false,
    });
  });
});
