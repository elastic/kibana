/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { getRenderCellValueFn } from './get_render_cell_value';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { CodeEditorProps } from '@kbn/code-editor';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { SourceDocument } from '../components/source_document';

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');

  const CodeEditorMock = (props: CodeEditorProps) => (
    <input
      data-test-subj={'mockCodeEditor'}
      data-value={props.value}
      value={props.value}
      onChange={jest.fn()}
    />
  );

  return {
    ...original,
    CodeEditor: CodeEditorMock,
  };
});

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
    getDefaultInstance: jest.fn(() => ({
      convert: (value: unknown) => (value ? value : '-'),
      // Support FormattedValue React rendering fallback path
      convertToReact: () => undefined,
      hasReactSupport: () => false,
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
  it('renders bytes column correctly', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const component = shallow(
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
    expect(component.html()).toMatchInlineSnapshot(
      `"<span class=\\"unifiedDataTable__cellValue\\"><span>100</span></span>"`
    );
  });

  it('renders bytes column correctly using _source when details is true', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const component = shallow(
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
    expect(component.html()).toMatchInlineSnapshot(
      `"<div data-test-subj=\\"dataTableExpandCellActionPopover\\" class=\\"euiFlexGroup css-1h68cm-euiFlexGroup-none-flexStart-stretch-row\\"><div class=\\"euiFlexItem css-9sbomz-euiFlexItem-grow-1\\"><span class=\\"unifiedDataTable__cellPopoverValue eui-textBreakWord css-i1xbf4-popover\\"><span>100</span></span></div><div class=\\"euiFlexItem css-kpsrin-euiFlexItem-growZero\\"><button class=\\"euiButtonIcon css-cxyb91-euiButtonIcon-xs-empty-primary\\" type=\\"button\\" aria-label=\\"Close popover\\" data-test-subj=\\"docTableClosePopover\\"><span data-euiicon-type=\\"cross\\" class=\\"euiButtonIcon__icon\\" aria-hidden=\\"true\\" color=\\"inherit\\"></span></button></div></div>"`
    );
  });

  it('renders bytes column correctly using fields when details is true', () => {
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
    const component = mountWithIntl(
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
    expect(component.html()).toMatchInlineSnapshot(
      `"<div data-test-subj=\\"dataTableExpandCellActionPopover\\" class=\\"euiFlexGroup css-1h68cm-euiFlexGroup-none-flexStart-stretch-row\\"><div class=\\"euiFlexItem css-9sbomz-euiFlexItem-grow-1\\"><span class=\\"unifiedDataTable__cellPopoverValue eui-textBreakWord css-i1xbf4-popover\\"><span>100</span></span></div><div class=\\"euiFlexItem css-kpsrin-euiFlexItem-growZero\\"><button class=\\"euiButtonIcon css-cxyb91-euiButtonIcon-xs-empty-primary\\" type=\\"button\\" aria-label=\\"Close popover\\" data-test-subj=\\"docTableClosePopover\\"><span data-euiicon-type=\\"cross\\" class=\\"euiButtonIcon__icon\\" aria-hidden=\\"true\\" color=\\"inherit\\"></span></button></div></div>"`
    );
    findTestSubject(component, 'docTableClosePopover').simulate('click');
    expect(closePopoverMockFn).toHaveBeenCalledTimes(1);
  });

  it('renders _source column correctly', () => {
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
    const component = shallow(
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

    const sourceDocumentComponent = component.find(SourceDocument);
    expect(sourceDocumentComponent.exists()).toBeTruthy();

    expect(sourceDocumentComponent.props()).toEqual({
      columnId: '_source',
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats,
      useTopLevelObjectColumns: false,
      maxEntries: 100,
      shouldShowFieldHandler: showFieldHandler,
      row: rows[0],
      isCompressed: true,
    });
  });

  it('renders _source column correctly when isDetails is set to true', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const component = shallow(
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
    expect(component).toMatchInlineSnapshot(`
      <SourcePopoverContent
        closeButton={
          <EuiButtonIcon
            aria-label="Close popover"
            data-test-subj="docTableClosePopover"
            iconSize="s"
            iconType="cross"
            onClick={[MockFunction]}
            size="xs"
          />
        }
        columnId="_source"
        row={
          Object {
            "flattened": Object {
              "_index": "test",
              "_score": 1,
              "bytes": 100,
              "extension": ".gz",
            },
            "id": "test::1::",
            "isAnchor": undefined,
            "raw": Object {
              "_id": "1",
              "_index": "test",
              "_score": 1,
              "_source": Object {
                "bytes": 100,
                "extension": ".gz",
              },
              "highlight": Object {
                "extension": Array [
                  "@kibana-highlighted-field.gz@/kibana-highlighted-field",
                ],
              },
            },
          }
        }
        useTopLevelObjectColumns={false}
      />
    `);
  });

  it('renders _source column correctly if on text based mode and have nulls', () => {
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
    const component = shallow(
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

    const sourceDocumentComponent = component.find(SourceDocument);
    expect(sourceDocumentComponent.exists()).toBeTruthy();

    expect(sourceDocumentComponent.props()).toEqual({
      columnId: '_source',
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats,
      useTopLevelObjectColumns: false,
      maxEntries: 100,
      shouldShowFieldHandler: showFieldHandler,
      row: rows[0],
      isPlainRecord: true,
      isCompressed: true,
    });
  });

  it('renders fields-based column correctly', () => {
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
    const component = shallow(
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

    const sourceDocumentComponent = component.find(SourceDocument);
    expect(sourceDocumentComponent.exists()).toBeTruthy();

    expect(sourceDocumentComponent.props()).toEqual({
      columnId: '_source',
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats,
      useTopLevelObjectColumns: false,
      maxEntries: 100,
      shouldShowFieldHandler: showFieldHandler,
      row: rows[0],
      isCompressed: true,
    });
  });

  it('limits amount of rendered items', () => {
    const rows = rowsFields.map(build);
    const showFieldHandler = (fieldName: string) => ['extension', 'bytes'].includes(fieldName);
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows,
      shouldShowFieldHandler: showFieldHandler,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      // this is the number of rendered items
      maxEntries: 1,
      columnsMeta: undefined,
    });
    const component = shallow(
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

    const sourceDocumentComponent = component.find(SourceDocument);
    expect(sourceDocumentComponent.exists()).toBeTruthy();

    expect(sourceDocumentComponent.props()).toEqual({
      columnId: '_source',
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats,
      useTopLevelObjectColumns: false,
      maxEntries: 1,
      shouldShowFieldHandler: showFieldHandler,
      row: rows[0],
      isCompressed: true,
    });
  });

  it('renders fields-based column correctly when isDetails is set to true', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFields.map(build),
      shouldShowFieldHandler: (fieldName: string) => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const component = shallow(
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
    expect(component).toMatchInlineSnapshot(`
      <SourcePopoverContent
        closeButton={
          <EuiButtonIcon
            aria-label="Close popover"
            data-test-subj="docTableClosePopover"
            iconSize="s"
            iconType="cross"
            onClick={[MockFunction]}
            size="xs"
          />
        }
        columnId="_source"
        row={
          Object {
            "flattened": Object {
              "_index": "test",
              "_score": 1,
              "bytes": Array [
                100,
              ],
              "extension": Array [
                ".gz",
              ],
            },
            "id": "test::1::",
            "isAnchor": undefined,
            "raw": Object {
              "_id": "1",
              "_index": "test",
              "_score": 1,
              "_source": undefined,
              "fields": Object {
                "bytes": Array [
                  100,
                ],
                "extension": Array [
                  ".gz",
                ],
              },
              "highlight": Object {
                "extension": Array [
                  "@kibana-highlighted-field.gz@/kibana-highlighted-field",
                ],
              },
            },
          }
        }
        useTopLevelObjectColumns={false}
      />
    `);
  });

  it('collect object fields and renders them like _source', () => {
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
    const component = shallow(
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

    const sourceDocumentComponent = component.find(SourceDocument);
    expect(sourceDocumentComponent.exists()).toBeTruthy();

    expect(sourceDocumentComponent.props()).toEqual({
      columnId: 'object',
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats,
      maxEntries: 100,
      shouldShowFieldHandler: showFieldHandler,
      useTopLevelObjectColumns: true,
      row: rows[0],
      isCompressed: true,
    });
  });

  it('collect object fields and renders them like _source with fallback for unmapped', () => {
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
    const component = shallow(
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

    const sourceDocumentComponent = component.find(SourceDocument);
    expect(sourceDocumentComponent.exists()).toBeTruthy();

    expect(sourceDocumentComponent.props()).toEqual({
      columnId: 'object',
      dataView: dataViewMock,
      fieldFormats: mockServices.fieldFormats,
      maxEntries: 100,
      shouldShowFieldHandler: showFieldHandler,
      useTopLevelObjectColumns: true,
      row: rows[0],
      isCompressed: true,
    });
  });

  it('collect object fields and renders them as json in details', () => {
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
    const component = shallow(
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
    expect(component).toMatchInlineSnapshot(`
      <SourcePopoverContent
        closeButton={
          <EuiButtonIcon
            aria-label="Close popover"
            data-test-subj="docTableClosePopover"
            iconSize="s"
            iconType="cross"
            onClick={[MockFunction]}
            size="xs"
          />
        }
        columnId="object"
        row={
          Object {
            "flattened": Object {
              "_index": "test",
              "_score": 1,
              "extension": Array [
                ".gz",
              ],
              "object.value": Array [
                100,
              ],
            },
            "id": "test::1::",
            "isAnchor": undefined,
            "raw": Object {
              "_id": "1",
              "_index": "test",
              "_score": 1,
              "_source": undefined,
              "fields": Object {
                "extension": Array [
                  ".gz",
                ],
                "object.value": Array [
                  100,
                ],
              },
              "highlight": Object {
                "extension": Array [
                  "@kibana-highlighted-field.gz@/kibana-highlighted-field",
                ],
              },
            },
          }
        }
        useTopLevelObjectColumns={true}
      />
    `);
  });

  it('renders a functional close button when CodeEditor is rendered', () => {
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
    const component = mountWithIntl(
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
    const gridSelectionBtn = findTestSubject(component, 'docTableClosePopover');
    gridSelectionBtn.simulate('click');
    expect(closePopoverMockFn).toHaveBeenCalledTimes(1);
  });

  it('does not collect subfields when the the column is unmapped but part of fields response', () => {
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
    const component = shallow(
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
    expect(component).toMatchInlineSnapshot(`
      <span
        className="unifiedDataTable__cellValue"
      >
        <FormatFieldValueReact
          dataView={
            Object {
              "docvalueFields": Array [],
              "fields": Array [
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "_source",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": false,
                  "subType": undefined,
                  "type": "_source",
                },
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "_index",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "message",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": false,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "extension",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": "bytesDisplayName",
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "bytes",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "scripted",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": true,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "object.value",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "@timestamp",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "date",
                },
              ],
              "getAllowHidden": [Function],
              "getComputedFields": [Function],
              "getFieldByName": [MockFunction],
              "getFormatterForField": [MockFunction] {
                "calls": Array [
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                ],
                "results": Array [
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                ],
              },
              "getIndexPattern": [Function],
              "getName": [Function],
              "getRuntimeField": [Function],
              "getScriptedField": [Function],
              "getSourceFiltering": [Function],
              "getTimeField": [Function],
              "id": "the-data-view-id",
              "isPersisted": [Function],
              "isTSDBMode": [Function],
              "isTimeBased": [Function],
              "isTimeNanosBased": [Function],
              "metaFields": Array [
                "_index",
                "_score",
              ],
              "name": "the-data-view",
              "setFieldCount": [MockFunction],
              "timeFieldName": undefined,
              "title": "the-data-view-title",
              "toMinimalSpec": [Function],
              "toSpec": [Function],
              "type": "default",
            }
          }
          field={
            Object {
              "aggregatable": true,
              "conflictDescriptions": undefined,
              "count": 0,
              "customDescription": undefined,
              "customLabel": undefined,
              "defaultFormatter": undefined,
              "esTypes": undefined,
              "lang": undefined,
              "name": "object.value",
              "readFromDocValues": false,
              "script": undefined,
              "scripted": false,
              "searchable": true,
              "subType": undefined,
              "type": "number",
            }
          }
          fieldFormats={
            Object {
              "getDefaultInstance": [MockFunction],
            }
          }
          hit={
            Object {
              "_id": "1",
              "_index": "test",
              "_score": 1,
              "_source": undefined,
              "fields": Object {
                "extension": Array [
                  ".gz",
                ],
                "object.value": Array [
                  100,
                ],
              },
              "highlight": Object {
                "extension": Array [
                  "@kibana-highlighted-field.gz@/kibana-highlighted-field",
                ],
              },
            }
          }
          value={
            Array [
              100,
            ]
          }
        />
      </span>
    `);
  });

  it('renders correctly when invalid row is given', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const component = shallow(
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
    expect(component.html()).toMatchInlineSnapshot(
      `"<span class=\\"unifiedDataTable__cellValue\\">-</span>"`
    );
  });

  it('renders correctly when invalid column is given', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const component = shallow(
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
    expect(component.html()).toMatchInlineSnapshot(
      `"<span class=\\"unifiedDataTable__cellValue\\"><span>-</span></span>"`
    );
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
      dataView: dataViewMock,
      rows: rowsFieldsUnmapped.map(build),
      shouldShowFieldHandler: (fieldName: string) => ['unmapped'].includes(fieldName),
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      columnsMeta: undefined,
    });
    const component = shallow(
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
    expect(component).toMatchInlineSnapshot(`
      <span
        className="unifiedDataTable__cellValue"
      >
        <FormatFieldValueReact
          dataView={
            Object {
              "docvalueFields": Array [],
              "fields": Array [
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "_source",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": false,
                  "subType": undefined,
                  "type": "_source",
                },
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "_index",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "message",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": false,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "extension",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": "bytesDisplayName",
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "bytes",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "scripted",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": true,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "object.value",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "@timestamp",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "date",
                },
              ],
              "getAllowHidden": [Function],
              "getComputedFields": [Function],
              "getFieldByName": [MockFunction],
              "getFormatterForField": [MockFunction] {
                "calls": Array [
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                ],
                "results": Array [
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                ],
              },
              "getIndexPattern": [Function],
              "getName": [Function],
              "getRuntimeField": [Function],
              "getScriptedField": [Function],
              "getSourceFiltering": [Function],
              "getTimeField": [Function],
              "id": "the-data-view-id",
              "isPersisted": [Function],
              "isTSDBMode": [Function],
              "isTimeBased": [Function],
              "isTimeNanosBased": [Function],
              "metaFields": Array [
                "_index",
                "_score",
              ],
              "name": "the-data-view",
              "setFieldCount": [MockFunction],
              "timeFieldName": undefined,
              "title": "the-data-view-title",
              "toMinimalSpec": [Function],
              "toSpec": [Function],
              "type": "default",
            }
          }
          fieldFormats={
            Object {
              "getDefaultInstance": [MockFunction] {
                "calls": Array [
                  Array [
                    "string",
                  ],
                ],
                "results": Array [
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                ],
              },
            }
          }
          hit={
            Object {
              "_id": "1",
              "_index": "test",
              "_score": 1,
              "_source": undefined,
              "fields": Object {
                "unmapped": Array [
                  ".gz",
                ],
              },
              "highlight": Object {
                "extension": Array [
                  "@kibana-highlighted-field.gz@/kibana-highlighted-field",
                ],
              },
            }
          }
          value={
            Array [
              ".gz",
            ]
          }
        />
      </span>
    `);

    const componentWithDetails = shallow(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="unmapped"
        isDetails={true}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(componentWithDetails).toMatchInlineSnapshot(`
      <EuiFlexGroup
        data-test-subj="dataTableExpandCellActionPopover"
        direction="row"
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem>
          <DataTablePopoverCellValue>
            <FormatFieldValueReact
              dataView={
                Object {
                  "docvalueFields": Array [],
                  "fields": Array [
                    Object {
                      "aggregatable": false,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": undefined,
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "_source",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": false,
                      "subType": undefined,
                      "type": "_source",
                    },
                    Object {
                      "aggregatable": false,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": undefined,
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "_index",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "string",
                    },
                    Object {
                      "aggregatable": false,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": undefined,
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "message",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": false,
                      "subType": undefined,
                      "type": "string",
                    },
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": undefined,
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "extension",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "string",
                    },
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": undefined,
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "scripted",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": true,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": undefined,
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "object.value",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": undefined,
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "@timestamp",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "date",
                    },
                  ],
                  "getAllowHidden": [Function],
                  "getComputedFields": [Function],
                  "getFieldByName": [MockFunction],
                  "getFormatterForField": [MockFunction] {
                    "calls": Array [
                      Array [
                        Object {
                          "aggregatable": true,
                          "conflictDescriptions": undefined,
                          "count": 0,
                          "customDescription": undefined,
                          "customLabel": "bytesDisplayName",
                          "defaultFormatter": undefined,
                          "esTypes": undefined,
                          "lang": undefined,
                          "name": "bytes",
                          "readFromDocValues": false,
                          "script": undefined,
                          "scripted": false,
                          "searchable": true,
                          "subType": undefined,
                          "type": "number",
                        },
                      ],
                      Array [
                        Object {
                          "aggregatable": true,
                          "conflictDescriptions": undefined,
                          "count": 0,
                          "customDescription": undefined,
                          "customLabel": "bytesDisplayName",
                          "defaultFormatter": undefined,
                          "esTypes": undefined,
                          "lang": undefined,
                          "name": "bytes",
                          "readFromDocValues": false,
                          "script": undefined,
                          "scripted": false,
                          "searchable": true,
                          "subType": undefined,
                          "type": "number",
                        },
                      ],
                      Array [
                        Object {
                          "aggregatable": true,
                          "conflictDescriptions": undefined,
                          "count": 0,
                          "customDescription": undefined,
                          "customLabel": "bytesDisplayName",
                          "defaultFormatter": undefined,
                          "esTypes": undefined,
                          "lang": undefined,
                          "name": "bytes",
                          "readFromDocValues": false,
                          "script": undefined,
                          "scripted": false,
                          "searchable": true,
                          "subType": undefined,
                          "type": "number",
                        },
                      ],
                    ],
                    "results": Array [
                      Object {
                        "type": "return",
                        "value": Object {
                          "convert": [Function],
                          "convertToReact": [Function],
                          "hasReactSupport": [Function],
                        },
                      },
                      Object {
                        "type": "return",
                        "value": Object {
                          "convert": [Function],
                          "convertToReact": [Function],
                          "hasReactSupport": [Function],
                        },
                      },
                      Object {
                        "type": "return",
                        "value": Object {
                          "convert": [Function],
                          "convertToReact": [Function],
                          "hasReactSupport": [Function],
                        },
                      },
                    ],
                  },
                  "getIndexPattern": [Function],
                  "getName": [Function],
                  "getRuntimeField": [Function],
                  "getScriptedField": [Function],
                  "getSourceFiltering": [Function],
                  "getTimeField": [Function],
                  "id": "the-data-view-id",
                  "isPersisted": [Function],
                  "isTSDBMode": [Function],
                  "isTimeBased": [Function],
                  "isTimeNanosBased": [Function],
                  "metaFields": Array [
                    "_index",
                    "_score",
                  ],
                  "name": "the-data-view",
                  "setFieldCount": [MockFunction],
                  "timeFieldName": undefined,
                  "title": "the-data-view-title",
                  "toMinimalSpec": [Function],
                  "toSpec": [Function],
                  "type": "default",
                }
              }
              fieldFormats={
                Object {
                  "getDefaultInstance": [MockFunction] {
                    "calls": Array [
                      Array [
                        "string",
                      ],
                    ],
                    "results": Array [
                      Object {
                        "type": "return",
                        "value": Object {
                          "convert": [Function],
                          "convertToReact": [Function],
                          "hasReactSupport": [Function],
                        },
                      },
                    ],
                  },
                }
              }
              hit={
                Object {
                  "_id": "1",
                  "_index": "test",
                  "_score": 1,
                  "_source": undefined,
                  "fields": Object {
                    "unmapped": Array [
                      ".gz",
                    ],
                  },
                  "highlight": Object {
                    "extension": Array [
                      "@kibana-highlighted-field.gz@/kibana-highlighted-field",
                    ],
                  },
                }
              }
              value={
                Array [
                  ".gz",
                ]
              }
            />
          </DataTablePopoverCellValue>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
        >
          <EuiButtonIcon
            aria-label="Close popover"
            data-test-subj="docTableClosePopover"
            iconSize="s"
            iconType="cross"
            onClick={[MockFunction]}
            size="xs"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    `);
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
      dataView: dataViewMock,
      rows: rows.map(build),
      shouldShowFieldHandler: () => true,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
    });
    const componentWithDataViewField = shallow(
      <DataTableCellValue
        rowIndex={0}
        colIndex={0}
        columnId="extension"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(componentWithDataViewField).toMatchInlineSnapshot(`
      <span
        className="unifiedDataTable__cellValue"
      >
        <FormatFieldValueReact
          dataView={
            Object {
              "docvalueFields": Array [],
              "fields": Array [
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "_source",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": false,
                  "subType": undefined,
                  "type": "_source",
                },
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "_index",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "message",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": false,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "extension",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": "bytesDisplayName",
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "bytes",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "scripted",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": true,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "object.value",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "@timestamp",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "date",
                },
              ],
              "getAllowHidden": [Function],
              "getComputedFields": [Function],
              "getFieldByName": [MockFunction],
              "getFormatterForField": [MockFunction] {
                "calls": Array [
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                ],
                "results": Array [
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                ],
              },
              "getIndexPattern": [Function],
              "getName": [Function],
              "getRuntimeField": [Function],
              "getScriptedField": [Function],
              "getSourceFiltering": [Function],
              "getTimeField": [Function],
              "id": "the-data-view-id",
              "isPersisted": [Function],
              "isTSDBMode": [Function],
              "isTimeBased": [Function],
              "isTimeNanosBased": [Function],
              "metaFields": Array [
                "_index",
                "_score",
              ],
              "name": "the-data-view",
              "setFieldCount": [MockFunction],
              "timeFieldName": undefined,
              "title": "the-data-view-title",
              "toMinimalSpec": [Function],
              "toSpec": [Function],
              "type": "default",
            }
          }
          field={
            Object {
              "aggregatable": true,
              "conflictDescriptions": undefined,
              "count": 0,
              "customDescription": undefined,
              "customLabel": undefined,
              "defaultFormatter": undefined,
              "esTypes": undefined,
              "lang": undefined,
              "name": "extension",
              "readFromDocValues": false,
              "script": undefined,
              "scripted": false,
              "searchable": true,
              "subType": undefined,
              "type": "string",
            }
          }
          fieldFormats={
            Object {
              "getDefaultInstance": [MockFunction] {
                "calls": Array [
                  Array [
                    "string",
                  ],
                ],
                "results": Array [
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                ],
              },
            }
          }
          hit={
            Object {
              "_id": "1",
              "_index": "test",
              "_score": 1,
              "_source": undefined,
              "fields": Object {
                "bytes": 100,
                "extension": "gif",
                "var0": 350,
              },
            }
          }
          value="gif"
        />
      </span>
    `);
    const componentWithCustomESQLField = shallow(
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
    expect(componentWithCustomESQLField).toMatchInlineSnapshot(`
      <span
        className="unifiedDataTable__cellValue"
      >
        <FormatFieldValueReact
          dataView={
            Object {
              "docvalueFields": Array [],
              "fields": Array [
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "_source",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": false,
                  "subType": undefined,
                  "type": "_source",
                },
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "_index",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "message",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": false,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "extension",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": "bytesDisplayName",
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "bytes",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "scripted",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": true,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "object.value",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "@timestamp",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "date",
                },
              ],
              "getAllowHidden": [Function],
              "getComputedFields": [Function],
              "getFieldByName": [MockFunction],
              "getFormatterForField": [MockFunction] {
                "calls": Array [
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                ],
                "results": Array [
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                ],
              },
              "getIndexPattern": [Function],
              "getName": [Function],
              "getRuntimeField": [Function],
              "getScriptedField": [Function],
              "getSourceFiltering": [Function],
              "getTimeField": [Function],
              "id": "the-data-view-id",
              "isPersisted": [Function],
              "isTSDBMode": [Function],
              "isTimeBased": [Function],
              "isTimeNanosBased": [Function],
              "metaFields": Array [
                "_index",
                "_score",
              ],
              "name": "the-data-view",
              "setFieldCount": [MockFunction],
              "timeFieldName": undefined,
              "title": "the-data-view-title",
              "toMinimalSpec": [Function],
              "toSpec": [Function],
              "type": "default",
            }
          }
          field={
            Object {
              "aggregatable": false,
              "conflictDescriptions": undefined,
              "count": 0,
              "customDescription": undefined,
              "customLabel": undefined,
              "defaultFormatter": undefined,
              "esTypes": Array [
                "long",
              ],
              "lang": undefined,
              "name": "var0",
              "readFromDocValues": false,
              "script": undefined,
              "scripted": false,
              "searchable": true,
              "subType": undefined,
              "type": "number",
            }
          }
          fieldFormats={
            Object {
              "getDefaultInstance": [MockFunction] {
                "calls": Array [
                  Array [
                    "string",
                  ],
                ],
                "results": Array [
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                ],
              },
            }
          }
          hit={
            Object {
              "_id": "1",
              "_index": "test",
              "_score": 1,
              "_source": undefined,
              "fields": Object {
                "bytes": 100,
                "extension": "gif",
                "var0": 350,
              },
            }
          }
          value={350}
        />
      </span>
    `);

    expect(dataViewMock.fields.create).toHaveBeenCalledTimes(1);
    expect(dataViewMock.fields.create).toHaveBeenCalledWith({
      name: 'var0',
      type: 'number',
      esTypes: ['long'],
      isComputedColumn: true,
      searchable: true,
      aggregatable: false,
      isNull: false,
    });

    const componentWithCustomESQLFieldOverride = shallow(
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
    expect(componentWithCustomESQLFieldOverride).toMatchInlineSnapshot(`
      <span
        className="unifiedDataTable__cellValue"
      >
        <FormatFieldValueReact
          dataView={
            Object {
              "docvalueFields": Array [],
              "fields": Array [
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "_source",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": false,
                  "subType": undefined,
                  "type": "_source",
                },
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "_index",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": false,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "message",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": false,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "extension",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "string",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": "bytesDisplayName",
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "bytes",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "scripted",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": true,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "object.value",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "number",
                },
                Object {
                  "aggregatable": true,
                  "conflictDescriptions": undefined,
                  "count": 0,
                  "customDescription": undefined,
                  "customLabel": undefined,
                  "defaultFormatter": undefined,
                  "esTypes": undefined,
                  "lang": undefined,
                  "name": "@timestamp",
                  "readFromDocValues": false,
                  "script": undefined,
                  "scripted": false,
                  "searchable": true,
                  "subType": undefined,
                  "type": "date",
                },
              ],
              "getAllowHidden": [Function],
              "getComputedFields": [Function],
              "getFieldByName": [MockFunction],
              "getFormatterForField": [MockFunction] {
                "calls": Array [
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                  Array [
                    Object {
                      "aggregatable": true,
                      "conflictDescriptions": undefined,
                      "count": 0,
                      "customDescription": undefined,
                      "customLabel": "bytesDisplayName",
                      "defaultFormatter": undefined,
                      "esTypes": undefined,
                      "lang": undefined,
                      "name": "bytes",
                      "readFromDocValues": false,
                      "script": undefined,
                      "scripted": false,
                      "searchable": true,
                      "subType": undefined,
                      "type": "number",
                    },
                  ],
                ],
                "results": Array [
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                ],
              },
              "getIndexPattern": [Function],
              "getName": [Function],
              "getRuntimeField": [Function],
              "getScriptedField": [Function],
              "getSourceFiltering": [Function],
              "getTimeField": [Function],
              "id": "the-data-view-id",
              "isPersisted": [Function],
              "isTSDBMode": [Function],
              "isTimeBased": [Function],
              "isTimeNanosBased": [Function],
              "metaFields": Array [
                "_index",
                "_score",
              ],
              "name": "the-data-view",
              "setFieldCount": [MockFunction],
              "timeFieldName": undefined,
              "title": "the-data-view-title",
              "toMinimalSpec": [Function],
              "toSpec": [Function],
              "type": "default",
            }
          }
          field={
            Object {
              "aggregatable": false,
              "conflictDescriptions": undefined,
              "count": 0,
              "customDescription": undefined,
              "customLabel": undefined,
              "defaultFormatter": undefined,
              "esTypes": Array [
                "keyword",
              ],
              "lang": undefined,
              "name": "bytes",
              "readFromDocValues": false,
              "script": undefined,
              "scripted": false,
              "searchable": true,
              "subType": undefined,
              "type": "string",
            }
          }
          fieldFormats={
            Object {
              "getDefaultInstance": [MockFunction] {
                "calls": Array [
                  Array [
                    "string",
                  ],
                ],
                "results": Array [
                  Object {
                    "type": "return",
                    "value": Object {
                      "convert": [Function],
                      "convertToReact": [Function],
                      "hasReactSupport": [Function],
                    },
                  },
                ],
              },
            }
          }
          hit={
            Object {
              "_id": "1",
              "_index": "test",
              "_score": 1,
              "_source": undefined,
              "fields": Object {
                "bytes": 100,
                "extension": "gif",
                "var0": 350,
              },
            }
          }
          value={100}
        />
      </span>
    `);

    expect(dataViewMock.fields.create).toHaveBeenCalledTimes(2);
    expect(dataViewMock.fields.create).toHaveBeenLastCalledWith({
      name: 'bytes',
      type: 'string',
      esTypes: ['keyword'],
      isComputedColumn: true,
      searchable: true,
      aggregatable: false,
      isNull: false,
    });
  });
});
