/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { of } from 'rxjs';
import { shallow } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { getRenderCellValueFn } from './get_render_cell_value';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { CodeEditorProps, KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

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

window.matchMedia = jest.fn().mockImplementation((query) => {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
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
    getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => (value ? value : '-') })),
  },
  theme: {
    theme$: of({ darkMode: false }),
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
      useNewFieldsApi: false,
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
      `"<span class=\\"unifiedDataTable__cellValue\\">100</span>"`
    );
  });

  it('renders bytes column correctly using _source when details is true', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      useNewFieldsApi: false,
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
      `"<div class=\\"euiFlexGroup css-1h68cm-euiFlexGroup-none-flexStart-stretch-row\\"><div class=\\"euiFlexItem css-9sbomz-euiFlexItem-grow-1\\"><span class=\\"unifiedDataTable__cellPopoverValue eui-textBreakWord\\">100</span></div><div class=\\"euiFlexItem css-kpsrin-euiFlexItem-growZero\\"><button class=\\"euiButtonIcon css-9sj1hz-euiButtonIcon-xs-empty-primary\\" type=\\"button\\" aria-label=\\"Close popover\\" data-test-subj=\\"docTableClosePopover\\"><span data-euiicon-type=\\"cross\\" class=\\"euiButtonIcon__icon\\" aria-hidden=\\"true\\" color=\\"inherit\\"></span></button></div></div>"`
    );
  });

  it('renders bytes column correctly using fields when details is true', () => {
    const closePopoverMockFn = jest.fn();
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFields.map(build),
      useNewFieldsApi: false,
      shouldShowFieldHandler: () => false,
      closePopover: closePopoverMockFn,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
      `"<div class=\\"euiFlexGroup css-1h68cm-euiFlexGroup-none-flexStart-stretch-row\\"><div class=\\"euiFlexItem css-9sbomz-euiFlexItem-grow-1\\"><span class=\\"unifiedDataTable__cellPopoverValue eui-textBreakWord\\">100</span></div><div class=\\"euiFlexItem css-kpsrin-euiFlexItem-growZero\\"><button class=\\"euiButtonIcon css-9sj1hz-euiButtonIcon-xs-empty-primary\\" type=\\"button\\" aria-label=\\"Close popover\\" data-test-subj=\\"docTableClosePopover\\"><span data-euiicon-type=\\"cross\\" class=\\"euiButtonIcon__icon\\" aria-hidden=\\"true\\" color=\\"inherit\\"></span></button></div></div>"`
    );
    findTestSubject(component, 'docTableClosePopover').simulate('click');
    expect(closePopoverMockFn).toHaveBeenCalledTimes(1);
  });

  it('renders _source column correctly', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      useNewFieldsApi: false,
      shouldShowFieldHandler: (fieldName) => ['extension', 'bytes'].includes(fieldName),
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
    expect(component).toMatchInlineSnapshot(`
      <EuiDescriptionList
        className="unifiedDataTable__descriptionList unifiedDataTable__cellValue"
        compressed={true}
        type="inline"
      >
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          extension
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": ".gz",
            }
          }
        />
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          bytesDisplayName
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": 100,
            }
          }
        />
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          _index
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": "test",
            }
          }
        />
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          _score
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": 1,
            }
          }
        />
      </EuiDescriptionList>
    `);
  });

  it('renders _source column correctly when isDetails is set to true', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      useNewFieldsApi: false,
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
      <EuiFlexGroup
        className="unifiedDataTable__cellPopover"
        direction="column"
        gutterSize="none"
        justifyContent="flexEnd"
      >
        <EuiFlexItem
          grow={false}
        >
          <EuiFlexGroup
            gutterSize="none"
            justifyContent="flexEnd"
            responsive={false}
          >
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
        </EuiFlexItem>
        <EuiFlexItem>
          <JsonCodeEditor
            height={200}
            json={
              Object {
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
              }
            }
            width={370}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    `);
  });

  it('renders _source column correctly if on text based mode and have nulls', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSourceWithEmptyValues.map(build),
      useNewFieldsApi: false,
      shouldShowFieldHandler: (fieldName) => ['extension', 'bytes'].includes(fieldName),
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
      isPlainRecord: true,
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
    expect(component).toMatchInlineSnapshot(`
      <EuiDescriptionList
        className="unifiedDataTable__descriptionList unifiedDataTable__cellValue"
        compressed={true}
        type="inline"
      >
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          bytesDisplayName
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": 100,
            }
          }
        />
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          _index
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": "test",
            }
          }
        />
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          _score
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": 1,
            }
          }
        />
      </EuiDescriptionList>
    `);
  });

  it('renders fields-based column correctly', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFields.map(build),
      useNewFieldsApi: true,
      shouldShowFieldHandler: (fieldName) => ['extension', 'bytes'].includes(fieldName),
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
    expect(component).toMatchInlineSnapshot(`
      <EuiDescriptionList
        className="unifiedDataTable__descriptionList unifiedDataTable__cellValue"
        compressed={true}
        type="inline"
      >
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          extension
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": Array [
                ".gz",
              ],
            }
          }
        />
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          bytesDisplayName
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": Array [
                100,
              ],
            }
          }
        />
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          _index
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": "test",
            }
          }
        />
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          _score
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": 1,
            }
          }
        />
      </EuiDescriptionList>
    `);
  });

  it('limits amount of rendered items', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFields.map(build),
      useNewFieldsApi: true,
      shouldShowFieldHandler: (fieldName) => ['extension', 'bytes'].includes(fieldName),
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      // this is the number of rendered items
      maxEntries: 1,
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
    expect(component).toMatchInlineSnapshot(`
      <EuiDescriptionList
        className="unifiedDataTable__descriptionList unifiedDataTable__cellValue"
        compressed={true}
        type="inline"
      >
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          extension
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": Array [
                ".gz",
              ],
            }
          }
        />
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          and 3 more fields
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": "",
            }
          }
        />
      </EuiDescriptionList>
    `);
  });

  it('renders fields-based column correctly when isDetails is set to true', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFields.map(build),
      useNewFieldsApi: true,
      shouldShowFieldHandler: (fieldName) => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
      <EuiFlexGroup
        className="unifiedDataTable__cellPopover"
        direction="column"
        gutterSize="none"
        justifyContent="flexEnd"
      >
        <EuiFlexItem
          grow={false}
        >
          <EuiFlexGroup
            gutterSize="none"
            justifyContent="flexEnd"
            responsive={false}
          >
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
        </EuiFlexItem>
        <EuiFlexItem>
          <JsonCodeEditor
            height={200}
            json={
              Object {
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
              }
            }
            width={370}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    `);
  });

  it('collect object fields and renders them like _source', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFieldsWithTopLevelObject.map(build),
      useNewFieldsApi: true,
      shouldShowFieldHandler: (fieldName) =>
        ['object.value', 'extension', 'bytes'].includes(fieldName),
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
    expect(component).toMatchInlineSnapshot(`
      <EuiDescriptionList
        className="unifiedDataTable__descriptionList unifiedDataTable__cellValue"
        compressed={true}
        type="inline"
      >
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          object.value
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": "100",
            }
          }
        />
      </EuiDescriptionList>
    `);
  });

  it('collect object fields and renders them like _source with fallback for unmapped', () => {
    (dataViewMock.getFieldByName as jest.Mock).mockReturnValueOnce(undefined);
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFieldsWithTopLevelObject.map(build),
      useNewFieldsApi: true,
      shouldShowFieldHandler: (fieldName) =>
        ['extension', 'bytes', 'object.value'].includes(fieldName),
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
    expect(component).toMatchInlineSnapshot(`
      <EuiDescriptionList
        className="unifiedDataTable__descriptionList unifiedDataTable__cellValue"
        compressed={true}
        type="inline"
      >
        <EuiDescriptionListTitle
          className="unifiedDataTable__descriptionListTitle"
        >
          object.value
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="unifiedDataTable__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": "100",
            }
          }
        />
      </EuiDescriptionList>
    `);
  });

  it('collect object fields and renders them as json in details', () => {
    const closePopoverMockFn = jest.fn();
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFieldsWithTopLevelObject.map(build),
      useNewFieldsApi: true,
      shouldShowFieldHandler: () => false,
      closePopover: closePopoverMockFn,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
      <EuiFlexGroup
        className="unifiedDataTable__cellPopover"
        direction="column"
        gutterSize="none"
        justifyContent="flexEnd"
      >
        <EuiFlexItem
          grow={false}
        >
          <EuiFlexGroup
            gutterSize="none"
            justifyContent="flexEnd"
            responsive={false}
          >
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
        </EuiFlexItem>
        <EuiFlexItem>
          <JsonCodeEditor
            height={200}
            json={
              Object {
                "object.value": Array [
                  100,
                ],
              }
            }
            width={370}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    `);
  });

  it('renders a functional close button when CodeEditor is rendered', () => {
    const closePopoverMockFn = jest.fn();
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsFieldsWithTopLevelObject.map(build),
      useNewFieldsApi: true,
      shouldShowFieldHandler: () => false,
      closePopover: closePopoverMockFn,
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
      useNewFieldsApi: true,
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
        dangerouslySetInnerHTML={
          Object {
            "__html": Array [
              100,
            ],
          }
        }
      />
    `);
  });

  it('renders correctly when invalid row is given', () => {
    const DataTableCellValue = getRenderCellValueFn({
      dataView: dataViewMock,
      rows: rowsSource.map(build),
      useNewFieldsApi: false,
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
      useNewFieldsApi: false,
      shouldShowFieldHandler: () => false,
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
      `"<span class=\\"unifiedDataTable__cellValue\\">-</span>"`
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
      useNewFieldsApi: true,
      shouldShowFieldHandler: (fieldName) => ['unmapped'].includes(fieldName),
      closePopover: jest.fn(),
      fieldFormats: mockServices.fieldFormats as unknown as FieldFormatsStart,
      maxEntries: 100,
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
        dangerouslySetInnerHTML={
          Object {
            "__html": Array [
              ".gz",
            ],
          }
        }
      />
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
        direction="row"
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem>
          <span
            className="unifiedDataTable__cellPopoverValue eui-textBreakWord"
            dangerouslySetInnerHTML={
              Object {
                "__html": Array [
                  ".gz",
                ],
              }
            }
          />
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
});
