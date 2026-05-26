/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CodeEditorProps } from '@kbn/code-editor';
import type { CustomCellRenderer } from '../types';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { EuiDataGridSetCellProps } from '@elastic/eui';
import React, { useEffect } from 'react';
import userEvent from '@testing-library/user-event';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import {
  columnsMetaOverridingBytesType,
  createDataViewWithBytesField,
  createFormatFieldValueReactSpy,
  dataViewMock,
  expectFieldCallToMatch,
} from '@kbn/discover-utils/src/__mocks__';
import { getRenderCellValueFn } from './get_render_cell_value';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderWithI18n } from '@kbn/test-jest-helpers';

const mockSourceDocument = jest.fn();

jest.mock('../components/source_document', () => {
  const original = jest.requireActual('../components/source_document');

  return {
    SourceDocument: (props: any) => {
      mockSourceDocument(props);
      return <original.SourceDocument {...props} />;
    },
  };
});

const mockSourcePopoverContent = jest.fn();

jest.mock('../components/source_popover_content', () => {
  const original = jest.requireActual('../components/source_popover_content');

  return {
    __esModule: true,
    default: (props: any) => {
      mockSourcePopoverContent(props);
      return <original.default {...props} />;
    },
  };
});

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');

  const CodeEditorMock = (props: CodeEditorProps) => (
    <input
      data-test-subj="mockCodeEditor"
      data-value={props.value}
      onChange={jest.fn()}
      value={props.value}
    />
  );

  return {
    ...original,
    CodeEditor: CodeEditorMock,
  };
});

const mockServices = {
  fieldFormats: {
    getDefaultInstance: jest.fn(() => ({
      convert: (value: unknown) => (value ? value : '-'),
      reactConvert: (value: unknown) => (value ? value : '-'),
    })),
  },
  settings: {
    client: {
      get: (key: string) => key === 'discover:maxDocFieldsDisplayed' && 200,
    },
  },
  uiSettings: {
    get: (key: string) => key === 'discover:maxDocFieldsDisplayed' && 200,
  },
};

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

const build = (hit: EsHitRecord) => buildDataTableRecord(hit, dataViewMock);

describe('Unified data table cell rendering', () => {
  beforeEach(() => {
    mockSourceDocument.mockClear();
    mockSourcePopoverContent.mockClear();
  });

  it('renders bytes column correctly', () => {
    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="bytes"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const element = screen.getByText('100');

    expect(element).toBeVisible();
    expect(element).toHaveClass('unifiedDataTable__cellValue');
  });

  it('renders bytes column correctly using _source when details is true', () => {
    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="bytes"
        isDetails={true}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    expect(screen.getByTestId('dataTableExpandCellActionPopover')).toBeVisible();
    expect(screen.getByText('100')).toBeVisible();
    expect(screen.getByTestId('docTableClosePopover')).toBeVisible();
  });

  it('renders bytes column correctly using fields when details is true', async () => {
    const closePopoverMockFn = jest.fn();
    const user = userEvent.setup();

    const DataTableCellValue = getRenderCellValueFn({
      closePopover: closePopoverMockFn,
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows: rowsFields.map(build),
      shouldShowFieldHandler: () => false,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="bytes"
        isDetails={true}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    expect(screen.getByTestId('dataTableExpandCellActionPopover')).toBeVisible();
    expect(screen.getByText('100')).toBeVisible();

    const closeBtn = screen.getByTestId('docTableClosePopover');
    await user.click(closeBtn);

    expect(closePopoverMockFn).toHaveBeenCalledTimes(1);
  });

  it('renders _source column correctly', () => {
    const showFieldHandler = (fieldName: string) => ['extension', 'bytes'].includes(fieldName);
    const rows = rowsSource.map(build);

    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows,
      shouldShowFieldHandler: showFieldHandler,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="_source"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const descriptionList = screen.getByTestId('discoverCellDescriptionList');
    expect(within(descriptionList).getByText('extension')).toBeVisible();
    expect(within(descriptionList).getByText('.gz')).toBeVisible();
    expect(within(descriptionList).getByText('bytesDisplayName')).toBeVisible();
    expect(within(descriptionList).getByText('100')).toBeVisible();
    expect(within(descriptionList).getByText('_score')).toBeVisible();
    expect(within(descriptionList).getByText('1')).toBeVisible();

    expect(mockSourceDocument).toHaveBeenCalledWith({
      columnId: '_source',
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats,
      isCompressed: true,
      maxEntries: 100,
      row: rows[0],
      shouldShowFieldHandler: showFieldHandler,
      useTopLevelObjectColumns: false,
    });
  });

  it('renders _source column in ES|QL mode even when dataView has no _source field', () => {
    // Avoid object spread: it drops the DataView type shape.
    // We only override getFieldByName for `_source` to simulate ES|QL views.
    const originalGetFieldByName = dataViewMock.getFieldByName.bind(dataViewMock);
    const dataViewWithoutSource: DataView = Object.create(dataViewMock) as DataView;
    dataViewWithoutSource.getFieldByName = (name: string) =>
      name === '_source' ? undefined : originalGetFieldByName(name);

    const rows: EsHitRecord[] = [
      {
        _id: '1',
        _index: 'test',
        _score: 1,
        _source: undefined,
        fields: { bytes: 100, extension: 'gif' },
      },
    ];

    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewWithoutSource,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      isPlainRecord: true,
      maxEntries: 100,
      rows: rows.map(build),
      shouldShowFieldHandler: () => true,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="_source"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const descriptionList = screen.getByTestId('discoverCellDescriptionList');
    expect(within(descriptionList).getByText('bytesDisplayName')).toBeVisible();
    expect(within(descriptionList).getByText('100')).toBeVisible();
    expect(within(descriptionList).getByText('extension')).toBeVisible();
    expect(within(descriptionList).getByText('gif')).toBeVisible();
    expect(within(descriptionList).getByText('_index')).toBeVisible();
    expect(within(descriptionList).getByText('test')).toBeVisible();
    expect(within(descriptionList).getByText('_score')).toBeVisible();
    expect(within(descriptionList).getByText('1')).toBeVisible();

    expect(mockSourceDocument).toHaveBeenCalled();
  });

  it('renders _source column correctly when isDetails is set to true', () => {
    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="_source"
        isDetails={true}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    expect(screen.getByTestId('dataTableExpandCellActionJsonPopover')).toBeVisible();
    expect(screen.getByTestId('mockCodeEditor')).toBeVisible();

    expect(mockSourcePopoverContent).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: '_source',
        row: expect.objectContaining({
          id: 'test::1::',
          flattened: {
            _index: 'test',
            _score: 1,
            bytes: 100,
            extension: '.gz',
          },
        }),
        useTopLevelObjectColumns: false,
      })
    );
  });

  it('renders _source column correctly if on text based mode and have nulls', () => {
    const showFieldHandler = (fieldName: string) => ['extension', 'bytes'].includes(fieldName);
    const rows = rowsSourceWithEmptyValues.map(build);

    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      isPlainRecord: true,
      maxEntries: 100,
      rows,
      shouldShowFieldHandler: showFieldHandler,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="_source"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const descriptionList = screen.getByTestId('discoverCellDescriptionList');
    expect(within(descriptionList).getByText('bytesDisplayName')).toBeVisible();
    expect(within(descriptionList).getByText('100')).toBeVisible();
    expect(within(descriptionList).getByText('_score')).toBeVisible();
    expect(within(descriptionList).getByText('1')).toBeVisible();

    expect(mockSourceDocument).toHaveBeenCalledWith({
      columnId: '_source',
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats,
      isCompressed: true,
      isPlainRecord: true,
      maxEntries: 100,
      row: rows[0],
      shouldShowFieldHandler: showFieldHandler,
      useTopLevelObjectColumns: false,
    });
  });

  it('renders fields-based column correctly', () => {
    const showFieldHandler = (fieldName: string) => ['extension', 'bytes'].includes(fieldName);
    const rows = rowsFields.map(build);

    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows,
      shouldShowFieldHandler: showFieldHandler,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="_source"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const descriptionList = screen.getByTestId('discoverCellDescriptionList');
    expect(within(descriptionList).getByText('extension')).toBeVisible();
    expect(within(descriptionList).getByText('.gz')).toBeVisible();
    expect(within(descriptionList).getByText('bytesDisplayName')).toBeVisible();
    expect(within(descriptionList).getByText('100')).toBeVisible();
    expect(within(descriptionList).getByText('_score')).toBeVisible();
    expect(within(descriptionList).getByText('1')).toBeVisible();

    expect(mockSourceDocument).toHaveBeenCalledWith({
      columnId: '_source',
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats,
      isCompressed: true,
      maxEntries: 100,
      row: rows[0],
      shouldShowFieldHandler: showFieldHandler,
      useTopLevelObjectColumns: false,
    });
  });

  it('limits amount of rendered items', () => {
    const showFieldHandler = (fieldName: string) => ['extension', 'bytes'].includes(fieldName);
    const rows = rowsFields.map(build);

    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      // this is the number of rendered items
      maxEntries: 1,
      rows,
      shouldShowFieldHandler: showFieldHandler,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="_source"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const descriptionList = screen.getByTestId('discoverCellDescriptionList');
    expect(within(descriptionList).getByText('extension')).toBeVisible();
    expect(within(descriptionList).getByText('.gz')).toBeVisible();
    expect(within(descriptionList).getByText('and 2 more fields')).toBeVisible();

    expect(mockSourceDocument).toHaveBeenCalledWith({
      columnId: '_source',
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats,
      isCompressed: true,
      maxEntries: 1,
      row: rows[0],
      shouldShowFieldHandler: showFieldHandler,
      useTopLevelObjectColumns: false,
    });
  });

  it('renders fields-based column correctly when isDetails is set to true', () => {
    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows: rowsFields.map(build),
      shouldShowFieldHandler: (_fieldName: string) => false,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="_source"
        isDetails={true}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    expect(screen.getByTestId('dataTableExpandCellActionJsonPopover')).toBeVisible();
    expect(screen.getByTestId('mockCodeEditor')).toBeVisible();

    expect(mockSourcePopoverContent).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: '_source',
        row: expect.objectContaining({
          id: 'test::1::',
          flattened: {
            _index: 'test',
            _score: 1,
            bytes: [100],
            extension: ['.gz'],
          },
        }),
        useTopLevelObjectColumns: false,
      })
    );
  });

  it('collect object fields and renders them like _source', () => {
    const showFieldHandler = (fieldName: string) =>
      ['object.value', 'extension', 'bytes'].includes(fieldName);
    const rows = rowsFieldsWithTopLevelObject.map(build);

    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows,
      shouldShowFieldHandler: showFieldHandler,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="object"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const descriptionList = screen.getByTestId('discoverCellDescriptionList');
    expect(within(descriptionList).getByText('object.value')).toBeVisible();
    expect(within(descriptionList).getByText('100')).toBeVisible();

    expect(mockSourceDocument).toHaveBeenCalledWith({
      columnId: 'object',
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats,
      isCompressed: true,
      maxEntries: 100,
      row: rows[0],
      shouldShowFieldHandler: showFieldHandler,
      useTopLevelObjectColumns: true,
    });
  });

  it('collect object fields and renders them like _source with fallback for unmapped', () => {
    (dataViewMock.getFieldByName as jest.Mock).mockReturnValueOnce(undefined);
    const showFieldHandler = (fieldName: string) =>
      ['extension', 'bytes', 'object.value'].includes(fieldName);
    const rows = rowsFieldsWithTopLevelObject.map(build);

    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows,
      shouldShowFieldHandler: showFieldHandler,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="object"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const descriptionList = screen.getByTestId('discoverCellDescriptionList');
    expect(within(descriptionList).getByText('object.value')).toBeVisible();
    expect(within(descriptionList).getByText('100')).toBeVisible();

    expect(mockSourceDocument).toHaveBeenCalledWith({
      columnId: 'object',
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats,
      isCompressed: true,
      maxEntries: 100,
      row: rows[0],
      shouldShowFieldHandler: showFieldHandler,
      useTopLevelObjectColumns: true,
    });
  });

  it('collect object fields and renders them as json in details', () => {
    const closePopoverMockFn = jest.fn();

    const DataTableCellValue = getRenderCellValueFn({
      closePopover: closePopoverMockFn,
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows: rowsFieldsWithTopLevelObject.map(build),
      shouldShowFieldHandler: () => false,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="object"
        isDetails={true}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    expect(screen.getByTestId('dataTableExpandCellActionJsonPopover')).toBeVisible();
    expect(screen.getByTestId('mockCodeEditor')).toBeVisible();

    expect(mockSourcePopoverContent).toHaveBeenCalledWith(
      expect.objectContaining({
        columnId: 'object',
        row: expect.objectContaining({
          id: 'test::1::',
          flattened: {
            _index: 'test',
            _score: 1,
            extension: ['.gz'],
            'object.value': [100],
          },
        }),
        useTopLevelObjectColumns: true,
      })
    );
  });

  it('renders a functional close button when CodeEditor is rendered', async () => {
    const closePopoverMockFn = jest.fn();
    const user = userEvent.setup();

    const DataTableCellValue = getRenderCellValueFn({
      closePopover: closePopoverMockFn,
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows: rowsFieldsWithTopLevelObject.map(build),
      shouldShowFieldHandler: () => false,
    });

    renderWithI18n(
      <KibanaContextProvider services={mockServices}>
        <DataTableCellValue
          colIndex={0}
          columnId="object"
          isDetails={true}
          isExpandable={true}
          isExpanded={false}
          rowIndex={0}
          setCellProps={jest.fn()}
        />
      </KibanaContextProvider>
    );

    const closeBtn = screen.getByTestId('docTableClosePopover');
    await user.click(closeBtn);

    expect(closePopoverMockFn).toHaveBeenCalledTimes(1);
  });

  it('does not collect subfields when the the column is unmapped but part of fields response', () => {
    (dataViewMock.getFieldByName as jest.Mock).mockReturnValueOnce(undefined);

    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows: rowsFieldsWithTopLevelObject.map(build),
      shouldShowFieldHandler: () => false,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="object.value"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const element = screen.getByText('100');
    expect(element).toBeVisible();
    expect(element).toHaveClass('unifiedDataTable__cellValue');
  });

  it('renders correctly when invalid row is given', () => {
    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={1}
        columnId="bytes"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={1}
        setCellProps={jest.fn()}
      />
    );

    const element = screen.getByText('-');
    expect(element).toBeVisible();
    expect(element).toHaveClass('unifiedDataTable__cellValue');
  });

  it('renders correctly when invalid column is given', () => {
    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="bytes-invalid"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const element = screen.getByText('-');
    expect(element).toBeVisible();
    expect(element).toHaveClass('unifiedDataTable__cellValue');
  });

  it('renders unmapped fields correctly', () => {
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
      closePopover: jest.fn(),
      columnsMeta: undefined,
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows: rowsFieldsUnmapped.map(build),
      shouldShowFieldHandler: (fieldName: string) => ['unmapped'].includes(fieldName),
    });

    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="unmapped"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const element = screen.getByText('.gz');
    expect(element).toBeVisible();
    expect(element).toHaveClass('unifiedDataTable__cellValue');

    cleanup();
    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="unmapped"
        isDetails={true}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const dataTableExpandCellActionPopover = screen.getByTestId('dataTableExpandCellActionPopover');
    expect(within(dataTableExpandCellActionPopover).getByText('.gz')).toBeVisible();
    expect(
      within(dataTableExpandCellActionPopover).getByTestId('docTableClosePopover')
    ).toBeVisible();
  });

  it('renders custom ES|QL fields correctly', () => {
    jest.spyOn(dataViewMock.fields, 'create');

    const rows: EsHitRecord[] = [
      {
        _id: '1',
        _index: 'test',
        _score: 1,
        _source: undefined,
        fields: { bytes: 100, var0: 350, extension: 'gif' },
      },
    ];

    const DataTableCellValue = getRenderCellValueFn({
      closePopover: jest.fn(),
      columnsMeta: {
        // custom ES|QL var
        var0: {
          type: 'number',
          esType: 'long',
        },
        // custom ES|QL override
        bytes: {
          type: 'string',
          esType: 'keyword',
        },
      },
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      rows: rows.map(build),
      shouldShowFieldHandler: () => true,
    });

    const { unmount } = renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="extension"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const element = screen.getByText('gif');
    expect(element).toBeVisible();
    expect(element).toHaveClass('unifiedDataTable__cellValue');

    unmount();
    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="var0"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const element2 = screen.getByText('350');
    expect(element2).toBeVisible();
    expect(element2).toHaveClass('unifiedDataTable__cellValue');

    expect(dataViewMock.fields.create).toHaveBeenCalledTimes(1);
    expect(dataViewMock.fields.create).toHaveBeenCalledWith({
      aggregatable: false,
      esTypes: ['long'],
      isComputedColumn: true,
      isNull: false,
      name: 'var0',
      searchable: true,
      type: 'number',
    });

    cleanup();
    renderWithI18n(
      <DataTableCellValue
        colIndex={0}
        columnId="bytes"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={jest.fn()}
      />
    );

    const element3 = screen.getByText('100');
    expect(element3).toBeVisible();
    expect(element3).toHaveClass('unifiedDataTable__cellValue');

    expect(dataViewMock.fields.create).toHaveBeenCalledTimes(2);
    expect(dataViewMock.fields.create).toHaveBeenLastCalledWith({
      aggregatable: false,
      esTypes: ['keyword'],
      isComputedColumn: true,
      isNull: false,
      name: 'bytes',
      searchable: true,
      type: 'string',
    });
  });

  describe('columnsMeta handling for _source column', () => {
    it('should use data view field type when columnsMeta is undefined', () => {
      const formatFieldValueReactSpy = createFormatFieldValueReactSpy();
      const testDataView = createDataViewWithBytesField();

      const rows = [
        buildDataTableRecord(
          {
            _id: '1',
            _index: 'test',
            _score: 1,
            _source: { bytes: 100 },
          },
          testDataView
        ),
      ];

      const DataTableCellValue = getRenderCellValueFn({
        closePopover: jest.fn(),
        columnsMeta: undefined,
        dataView: testDataView,
        fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
        maxEntries: 100,
        rows,
        shouldShowFieldHandler: () => true,
      });

      renderWithI18n(
        <DataTableCellValue
          colIndex={0}
          columnId="_source"
          isDetails={false}
          isExpandable={true}
          isExpanded={false}
          rowIndex={0}
          setCellProps={jest.fn()}
        />
      );

      const discoverCellDescriptionList = screen.getByTestId('discoverCellDescriptionList');
      expect(within(discoverCellDescriptionList).getByText('bytes')).toBeVisible();
      expect(within(discoverCellDescriptionList).getByText('_index')).toBeVisible();
      expect(within(discoverCellDescriptionList).getByText('_score')).toBeVisible();
      expect(within(discoverCellDescriptionList).getAllByText('formatted')).toHaveLength(3);

      expectFieldCallToMatch(formatFieldValueReactSpy, 'bytes', 'number');
      formatFieldValueReactSpy.mockRestore();
    });

    it('should use columnsMeta type instead of data view field type when provided', () => {
      const formatFieldValueReactSpy = createFormatFieldValueReactSpy();
      const testDataView = createDataViewWithBytesField();

      const rows = [
        buildDataTableRecord(
          {
            _id: '1',
            _index: 'test',
            _score: 1,
            _source: { bytes: '100' },
          },
          testDataView
        ),
      ];

      const DataTableCellValue = getRenderCellValueFn({
        closePopover: jest.fn(),
        columnsMeta: columnsMetaOverridingBytesType,
        dataView: testDataView,
        fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
        maxEntries: 100,
        rows,
        shouldShowFieldHandler: () => true,
      });

      renderWithI18n(
        <DataTableCellValue
          colIndex={0}
          columnId="_source"
          isDetails={false}
          isExpandable={true}
          isExpanded={false}
          rowIndex={0}
          setCellProps={jest.fn()}
        />
      );

      const discoverCellDescriptionList = screen.getByTestId('discoverCellDescriptionList');
      expect(within(discoverCellDescriptionList).getByText('bytes')).toBeVisible();
      expect(within(discoverCellDescriptionList).getByText('_index')).toBeVisible();
      expect(within(discoverCellDescriptionList).getByText('_score')).toBeVisible();
      expect(within(discoverCellDescriptionList).getAllByText('formatted')).toHaveLength(3);

      expectFieldCallToMatch(formatFieldValueReactSpy, 'bytes', 'string', ['keyword']);
      formatFieldValueReactSpy.mockRestore();
    });
  });

  describe('setCellProps handling', () => {
    const customCellProps: EuiDataGridSetCellProps = {
      className: 'custom-cell',
      style: { backgroundColor: 'pink', color: 'white' },
      'data-test-subj': 'custom-renderer-cell',
    };

    const highlightedCellProps: EuiDataGridSetCellProps = {
      className: 'unifiedDataTable__cell--highlight',
      style: {},
    };

    const mergedCellProps: EuiDataGridSetCellProps = {
      ...customCellProps,
      className: 'unifiedDataTable__cell--highlight custom-cell',
    };

    const customCellRenderers: CustomCellRenderer = {
      bytes: function BytesRenderer({ setCellProps }) {
        useEffect(() => {
          setCellProps(customCellProps);
        }, [setCellProps]);

        return null;
      },
    };

    const highlightedRows = rowsSource.map((hit) => ({ ...build(hit), isAnchor: true }));
    const plainRows = rowsSource.map(build);

    const getDataTableCellValue = (
      externalCustomRenderers?: CustomCellRenderer,
      rows: DataTableRecord[] = highlightedRows
    ) =>
      getRenderCellValueFn({
        closePopover: jest.fn(),
        columnsMeta: undefined,
        dataView: dataViewMock,
        externalCustomRenderers,
        fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
        maxEntries: 100,
        rows,
        shouldShowFieldHandler: () => false,
      });

    const renderCellValue = (
      DataTableCellValue: ReturnType<typeof getRenderCellValueFn>,
      setCellProps: jest.Mock
    ) => (
      <DataTableCellValue
        colIndex={0}
        columnId="bytes"
        isDetails={false}
        isExpandable={true}
        isExpanded={false}
        rowIndex={0}
        setCellProps={setCellProps}
      />
    );

    it('merges internal and custom cell props', async () => {
      const setCellProps = jest.fn();

      renderWithI18n(renderCellValue(getDataTableCellValue(customCellRenderers), setCellProps));

      await waitFor(() => {
        expect(setCellProps).toHaveBeenLastCalledWith(mergedCellProps);
      });
    });

    it('clears custom cell props when the custom renderer is removed', async () => {
      const setCellProps = jest.fn();
      const initialDataTableCellValue = getDataTableCellValue(customCellRenderers);
      const nextDataTableCellValue = getDataTableCellValue();

      const { rerender } = renderWithI18n(renderCellValue(initialDataTableCellValue, setCellProps));

      await waitFor(() => {
        expect(setCellProps).toHaveBeenLastCalledWith(mergedCellProps);
      });

      rerender(renderCellValue(nextDataTableCellValue, setCellProps));

      await waitFor(() => {
        expect(setCellProps).toHaveBeenLastCalledWith(highlightedCellProps);
      });
    });

    it('keeps custom cell props when the internal highlight is removed', async () => {
      const setCellProps = jest.fn();
      const initialDataTableCellValue = getDataTableCellValue(customCellRenderers);
      const nextDataTableCellValue = getDataTableCellValue(customCellRenderers, plainRows);

      const { rerender } = renderWithI18n(renderCellValue(initialDataTableCellValue, setCellProps));

      await waitFor(() => {
        expect(setCellProps).toHaveBeenLastCalledWith(mergedCellProps);
      });

      rerender(renderCellValue(nextDataTableCellValue, setCellProps));

      await waitFor(() => {
        expect(setCellProps).toHaveBeenLastCalledWith(customCellProps);
      });
    });
  });
});
