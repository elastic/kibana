/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { getRenderCellValueFn } from './get_render_cell_value';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { flattenHit } from '@kbn/data-plugin/public';
import { ElasticSearchHit } from '../../types';

jest.mock('../../utils/use_discover_services', () => {
  const services = {
    uiSettings: {
      get: (key: string) => key === 'discover:maxDocFieldsDisplayed' && 200,
    },
    fieldFormats: {
      getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => (value ? value : '-') })),
    },
  };
  const originalModule = jest.requireActual('../../utils/use_discover_services');
  return {
    ...originalModule,
    useDiscoverServices: () => services,
  };
});

const rowsSource: ElasticSearchHit[] = [
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

const rowsFields: ElasticSearchHit[] = [
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

const rowsFieldsWithTopLevelObject: ElasticSearchHit[] = [
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

const flatten = (hit: ElasticSearchHit): Record<string, unknown> => {
  return flattenHit(hit, indexPatternMock);
};

describe('Discover grid cell rendering', function () {
  it('renders bytes column correctly', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsSource,
      rowsSource.map(flatten),
      false,
      [],
      100
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
    expect(component.html()).toMatchInlineSnapshot(`"<span>100</span>"`);
  });

  it('renders bytes column correctly using _source when details is true', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsSource,
      rowsSource.map(flatten),
      false,
      [],
      100
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
    expect(component.html()).toMatchInlineSnapshot(`"<span>100</span>"`);
  });

  it('renders bytes column correctly using fields when details is true', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsFields,
      rowsFields.map(flatten),
      false,
      [],
      100
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
    expect(component.html()).toMatchInlineSnapshot(`"<span>100</span>"`);
  });

  it('renders _source column correctly', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsSource,
      rowsSource.map(flatten),
      false,
      ['extension', 'bytes'],
      100
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
        className="dscDiscoverGrid__descriptionList"
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
      indexPatternMock,
      rowsSource,
      rowsSource.map(flatten),
      false,
      [],
      100
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
      <JsonCodeEditor
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
    `);
  });

  it('renders fields-based column correctly', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsFields,
      rowsFields.map(flatten),
      true,
      ['extension', 'bytes'],
      100
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
        className="dscDiscoverGrid__descriptionList"
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
      indexPatternMock,
      rowsFields,
      rowsFields.map(flatten),
      true,
      ['extension', 'bytes'],
      // this is the number of rendered items
      1
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
        className="dscDiscoverGrid__descriptionList"
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
      indexPatternMock,
      rowsFields,
      rowsFields.map(flatten),
      true,
      [],
      100
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
      <JsonCodeEditor
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
    `);
  });

  it('collect object fields and renders them like _source', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsFieldsWithTopLevelObject,
      rowsFieldsWithTopLevelObject.map(flatten),
      true,
      ['object.value', 'extension', 'bytes'],
      100
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
        className="dscDiscoverGrid__descriptionList"
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
    (indexPatternMock.getFieldByName as jest.Mock).mockReturnValueOnce(undefined);
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsFieldsWithTopLevelObject,
      rowsFieldsWithTopLevelObject.map(flatten),
      true,
      ['extension', 'bytes', 'object.value'],
      100
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
        className="dscDiscoverGrid__descriptionList"
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
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsFieldsWithTopLevelObject,
      rowsFieldsWithTopLevelObject.map(flatten),
      true,
      [],
      100
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
      <JsonCodeEditor
        json={
          Object {
            "object.value": Array [
              100,
            ],
          }
        }
        width={370}
      />
    `);
  });

  it('does not collect subfields when the the column is unmapped but part of fields response', () => {
    (indexPatternMock.getFieldByName as jest.Mock).mockReturnValueOnce(undefined);
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsFieldsWithTopLevelObject,
      rowsFieldsWithTopLevelObject.map(flatten),
      true,
      [],
      100
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
      indexPatternMock,
      rowsSource,
      rowsSource.map(flatten),
      false,
      [],
      100
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
    expect(component.html()).toMatchInlineSnapshot(`"<span>-</span>"`);
  });

  it('renders correctly when invalid column is given', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsSource,
      rowsSource.map(flatten),
      false,
      [],
      100
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
    expect(component.html()).toMatchInlineSnapshot(`"<span>-</span>"`);
  });

  it('renders unmapped fields correctly', () => {
    (indexPatternMock.getFieldByName as jest.Mock).mockReturnValueOnce(undefined);
    const rowsFieldsUnmapped: ElasticSearchHit[] = [
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
      indexPatternMock,
      rowsFieldsUnmapped,
      rowsFieldsUnmapped.map(flatten),
      true,
      ['unmapped'],
      100
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
      <span
        dangerouslySetInnerHTML={
          Object {
            "__html": Array [
              ".gz",
            ],
          }
        }
      />
    `);
  });
});
