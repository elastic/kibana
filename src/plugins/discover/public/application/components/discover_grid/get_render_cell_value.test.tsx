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
import { indexPatternMock } from '../../../__mocks__/index_pattern';

const rowsSource = [
  {
    _id: '1',
    _index: 'test',
    _type: 'test',
    _score: 1,
    _source: { bytes: 100, extension: '.gz' },
    highlight: {
      extension: '@kibana-highlighted-field.gz@/kibana-highlighted-field',
    },
  },
];

const rowsFields = [
  {
    _id: '1',
    _index: 'test',
    _type: 'test',
    _score: 1,
    _source: undefined,
    fields: { bytes: [100], extension: ['.gz'] },
    highlight: {
      extension: '@kibana-highlighted-field.gz@/kibana-highlighted-field',
    },
  },
];

const rowsFieldsWithTopLevelObject = [
  {
    _id: '1',
    _index: 'test',
    _type: 'test',
    _score: 1,
    _source: undefined,
    fields: { 'object.value': [100], extension: ['.gz'] },
    highlight: {
      extension: '@kibana-highlighted-field.gz@/kibana-highlighted-field',
    },
  },
];

describe('Discover grid cell rendering', function () {
  it('renders bytes column correctly', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsSource,
      rowsSource.map((row) => indexPatternMock.flattenHit(row)),
      false
    );
    const component = shallow(
      <DiscoverGridCellValue
        rowIndex={0}
        columnId="bytes"
        isDetails={false}
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
      rowsSource.map((row) => indexPatternMock.flattenHit(row)),
      false
    );
    const component = shallow(
      <DiscoverGridCellValue
        rowIndex={0}
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
          bytes
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription
          className="dscDiscoverGrid__descriptionListDescription"
          dangerouslySetInnerHTML={
            Object {
              "__html": 100,
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
      rowsSource.map((row) => indexPatternMock.flattenHit(row)),
      false
    );
    const component = shallow(
      <DiscoverGridCellValue
        rowIndex={0}
        columnId="_source"
        isDetails={true}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(component.html()).toMatchInlineSnapshot(`
      "<span>{
        &quot;_id&quot;: &quot;1&quot;,
        &quot;_index&quot;: &quot;test&quot;,
        &quot;_type&quot;: &quot;test&quot;,
        &quot;_score&quot;: 1,
        &quot;_source&quot;: {
          &quot;bytes&quot;: 100,
          &quot;extension&quot;: &quot;.gz&quot;
        },
        &quot;highlight&quot;: {
          &quot;extension&quot;: &quot;@kibana-highlighted-field.gz@/kibana-highlighted-field&quot;
        }
      }</span>"
    `);
  });

  it('renders fields-based column correctly', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsFields,
      rowsFields.map((row) => indexPatternMock.flattenHit(row)),
      true
    );
    const component = shallow(
      <DiscoverGridCellValue
        rowIndex={0}
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
          bytes
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
      </EuiDescriptionList>
    `);
  });

  it('renders fields-based column correctly when isDetails is set to true', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsFields,
      rowsFields.map((row) => indexPatternMock.flattenHit(row)),
      true
    );
    const component = shallow(
      <DiscoverGridCellValue
        rowIndex={0}
        columnId="_source"
        isDetails={true}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(component.html()).toMatchInlineSnapshot(`
      "<span>{
        &quot;_id&quot;: &quot;1&quot;,
        &quot;_index&quot;: &quot;test&quot;,
        &quot;_type&quot;: &quot;test&quot;,
        &quot;_score&quot;: 1,
        &quot;fields&quot;: {
          &quot;bytes&quot;: [
            100
          ],
          &quot;extension&quot;: [
            &quot;.gz&quot;
          ]
        },
        &quot;highlight&quot;: {
          &quot;extension&quot;: &quot;@kibana-highlighted-field.gz@/kibana-highlighted-field&quot;
        }
      }</span>"
    `);
  });

  it('collect object fields and renders them like _source', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsFieldsWithTopLevelObject,
      rowsFieldsWithTopLevelObject.map((row) => indexPatternMock.flattenHit(row)),
      true
    );
    const component = shallow(
      <DiscoverGridCellValue
        rowIndex={0}
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
              "__html": "formatted",
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
      rowsFieldsWithTopLevelObject.map((row) => indexPatternMock.flattenHit(row)),
      true
    );
    const component = shallow(
      <DiscoverGridCellValue
        rowIndex={0}
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
      rowsFieldsWithTopLevelObject.map((row) => indexPatternMock.flattenHit(row)),
      true
    );
    const component = shallow(
      <DiscoverGridCellValue
        rowIndex={0}
        columnId="object"
        isDetails={true}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(component).toMatchInlineSnapshot(`
      <span>
        {
        "object.value": [
          100
        ]
      }
      </span>
    `);
  });

  it('does not collect subfields when the the column is unmapped but part of fields response', () => {
    (indexPatternMock.getFieldByName as jest.Mock).mockReturnValueOnce(undefined);
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsFieldsWithTopLevelObject,
      rowsFieldsWithTopLevelObject.map((row) => indexPatternMock.flattenHit(row)),
      true
    );
    const component = shallow(
      <DiscoverGridCellValue
        rowIndex={0}
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
            "__html": 100,
          }
        }
      />
    `);
  });

  it('renders correctly when invalid row is given', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rowsSource,
      rowsSource.map((row) => indexPatternMock.flattenHit(row)),
      false
    );
    const component = shallow(
      <DiscoverGridCellValue
        rowIndex={1}
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
      rowsSource.map((row) => indexPatternMock.flattenHit(row)),
      false
    );
    const component = shallow(
      <DiscoverGridCellValue
        rowIndex={0}
        columnId="bytes-invalid"
        isDetails={false}
        isExpanded={false}
        isExpandable={true}
        setCellProps={jest.fn()}
      />
    );
    expect(component.html()).toMatchInlineSnapshot(`"<span>-</span>"`);
  });
});
