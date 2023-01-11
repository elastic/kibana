/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { getRenderCellValueFn } from './get_render_cell_value';
import { dataViewMock } from '../../__mocks__/data_view';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { buildDataTableRecord } from '../../utils/build_data_record';
import { EsHitRecord } from '../../types';

const mockServices = {
  uiSettings: {
    get: (key: string) => key === 'discover:maxDocFieldsDisplayed' && 200,
  },
  fieldFormats: {
    getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => (value ? value : '-') })),
  },
};

jest.mock('../../hooks/use_discover_services', () => {
  const originalModule = jest.requireActual('../../hooks/use_discover_services');
  return {
    ...originalModule,
    useDiscoverServices: () => mockServices,
  };
});

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

describe('Discover grid cell rendering', function () {
  it('renders bytes column correctly', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsSource.map(build),
      false,
      () => false,
      100,
      jest.fn()
    );
    const component = shallow(
      <DiscoverGridCellValue
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
      `"<span class=\\"dscDiscoverGrid__cellValue\\">100</span>"`
    );
  });

  it('renders bytes column correctly using _source when details is true', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsSource.map(build),
      false,
      () => false,
      100,
      jest.fn()
    );
    const component = shallow(
      <DiscoverGridCellValue
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
      `"<div class=\\"euiFlexGroup css-1h68cm-euiFlexGroup-none-flexStart-stretch-row\\"><div class=\\"euiFlexItem css-9sbomz-euiFlexItem-grow-1\\"><span class=\\"dscDiscoverGrid__cellPopoverValue eui-textBreakWord\\">100</span></div><div class=\\"euiFlexItem css-kpsrin-euiFlexItem-growZero\\"><button class=\\"euiButtonIcon euiButtonIcon--xSmall css-1q7ycil-euiButtonIcon-empty-primary-hoverStyles\\" type=\\"button\\" aria-label=\\"Close popover\\" data-test-subj=\\"docTableClosePopover\\"><span data-euiicon-type=\\"cross\\" class=\\"euiButtonIcon__icon\\" aria-hidden=\\"true\\" color=\\"inherit\\"></span></button></div></div>"`
    );
  });

  it('renders bytes column correctly using fields when details is true', () => {
    const closePopoverMockFn = jest.fn();
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsFields.map(build),
      false,
      () => false,
      100,
      closePopoverMockFn
    );
    const component = mountWithIntl(
      <DiscoverGridCellValue
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
      `"<div class=\\"euiFlexGroup css-1h68cm-euiFlexGroup-none-flexStart-stretch-row\\"><div class=\\"euiFlexItem css-9sbomz-euiFlexItem-grow-1\\"><span class=\\"dscDiscoverGrid__cellPopoverValue eui-textBreakWord\\">100</span></div><div class=\\"euiFlexItem css-kpsrin-euiFlexItem-growZero\\"><button class=\\"euiButtonIcon euiButtonIcon--xSmall css-1q7ycil-euiButtonIcon-empty-primary-hoverStyles\\" type=\\"button\\" aria-label=\\"Close popover\\" data-test-subj=\\"docTableClosePopover\\"><span data-euiicon-type=\\"cross\\" class=\\"euiButtonIcon__icon\\" aria-hidden=\\"true\\" color=\\"inherit\\"></span></button></div></div>"`
    );
    findTestSubject(component, 'docTableClosePopover').simulate('click');
    expect(closePopoverMockFn).toHaveBeenCalledTimes(1);
  });

  it('renders _source column correctly', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsSource.map(build),
      false,
      (fieldName) => ['extension', 'bytes'].includes(fieldName),
      100,
      jest.fn()
    );
    const component = shallow(
      <DiscoverGridCellValue
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
        className="dscDiscoverGrid__descriptionList dscDiscoverGrid__cellValue"
        compressed={true}
        type="inline"
      >
        <EuiDescriptionListTitle>
          extension
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": ".gz",
            }
          }
        />
        <EuiDescriptionListTitle>
          bytesDisplayName
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": 100,
            }
          }
        />
        <EuiDescriptionListTitle>
          _index
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": "test",
            }
          }
        />
        <EuiDescriptionListTitle>
          _score
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
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
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsSource.map(build),
      false,
      () => false,
      100,
      jest.fn()
    );
    const component = shallow(
      <DiscoverGridCellValue
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
        className="dscDiscoverGrid__cellPopover"
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

  it('renders fields-based column correctly', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsFields.map(build),
      true,
      (fieldName) => ['extension', 'bytes'].includes(fieldName),
      100,
      jest.fn()
    );
    const component = shallow(
      <DiscoverGridCellValue
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
        className="dscDiscoverGrid__descriptionList dscDiscoverGrid__cellValue"
        compressed={true}
        type="inline"
      >
        <EuiDescriptionListTitle>
          extension
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": Array [
                ".gz",
              ],
            }
          }
        />
        <EuiDescriptionListTitle>
          bytesDisplayName
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": Array [
                100,
              ],
            }
          }
        />
        <EuiDescriptionListTitle>
          _index
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": "test",
            }
          }
        />
        <EuiDescriptionListTitle>
          _score
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
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
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsFields.map(build),
      true,
      (fieldName) => ['extension', 'bytes'].includes(fieldName),
      // this is the number of rendered items
      1,
      jest.fn()
    );
    const component = shallow(
      <DiscoverGridCellValue
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
        className="dscDiscoverGrid__descriptionList dscDiscoverGrid__cellValue"
        compressed={true}
        type="inline"
      >
        <EuiDescriptionListTitle>
          extension
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": Array [
                ".gz",
              ],
            }
          }
        />
        <EuiDescriptionListTitle>
          bytesDisplayName
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": Array [
                100,
              ],
            }
          }
        />
        <EuiDescriptionListTitle>
          _index
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": "test",
            }
          }
        />
        <EuiDescriptionListTitle>
          _score
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": 1,
            }
          }
        />
      </EuiDescriptionList>
    `);
  });

  it('renders fields-based column correctly when isDetails is set to true', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsFields.map(build),
      true,
      (fieldName) => false,
      100,
      jest.fn()
    );
    const component = shallow(
      <DiscoverGridCellValue
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
        className="dscDiscoverGrid__cellPopover"
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
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsFieldsWithTopLevelObject.map(build),
      true,
      (fieldName) => ['object.value', 'extension', 'bytes'].includes(fieldName),
      100,
      jest.fn()
    );
    const component = shallow(
      <DiscoverGridCellValue
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
        className="dscDiscoverGrid__descriptionList dscDiscoverGrid__cellValue"
        compressed={true}
        type="inline"
      >
        <EuiDescriptionListTitle>
          object.value
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
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
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsFieldsWithTopLevelObject.map(build),
      true,
      (fieldName) => ['extension', 'bytes', 'object.value'].includes(fieldName),
      100,
      jest.fn()
    );
    const component = shallow(
      <DiscoverGridCellValue
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
        className="dscDiscoverGrid__descriptionList dscDiscoverGrid__cellValue"
        compressed={true}
        type="inline"
      >
        <EuiDescriptionListTitle>
          object.value
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
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
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsFieldsWithTopLevelObject.map(build),
      true,
      () => false,
      100,
      closePopoverMockFn
    );
    const component = shallow(
      <DiscoverGridCellValue
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
        className="dscDiscoverGrid__cellPopover"
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
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsFieldsWithTopLevelObject.map(build),
      true,
      () => false,
      100,
      closePopoverMockFn
    );
    const component = mountWithIntl(
      <KibanaContextProvider services={mockServices}>
        <DiscoverGridCellValue
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
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsFieldsWithTopLevelObject.map(build),
      true,
      () => false,
      100,
      jest.fn()
    );
    const component = shallow(
      <DiscoverGridCellValue
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
        className="dscDiscoverGrid__cellValue"
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
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsSource.map(build),
      false,
      () => false,
      100,
      jest.fn()
    );
    const component = shallow(
      <DiscoverGridCellValue
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
      `"<span class=\\"dscDiscoverGrid__cellValue\\">-</span>"`
    );
  });

  it('renders correctly when invalid column is given', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsSource.map(build),
      false,
      () => false,
      100,
      jest.fn()
    );
    const component = shallow(
      <DiscoverGridCellValue
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
      `"<span class=\\"dscDiscoverGrid__cellValue\\">-</span>"`
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
    const DiscoverGridCellValue = getRenderCellValueFn(
      dataViewMock,
      rowsFieldsUnmapped.map(build),
      true,
      (fieldName) => ['unmapped'].includes(fieldName),
      100,
      jest.fn()
    );
    const component = shallow(
      <DiscoverGridCellValue
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
        className="dscDiscoverGrid__cellValue"
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
      <DiscoverGridCellValue
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
            className="dscDiscoverGrid__cellPopoverValue eui-textBreakWord"
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
