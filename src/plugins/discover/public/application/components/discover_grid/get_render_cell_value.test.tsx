/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { getRenderCellValueFn } from './get_render_cell_value';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
const rows = [
  {
    _id: '1',
    _index: 'test',
    _type: 'test',
    _score: 1,
    _source: { bytes: 100 },
  },
];

describe('Discover grid cell rendering', function () {
  it('renders bytes column correctly', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rows,
      rows.map((row) => indexPatternMock.flattenHit(row))
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
      rows,
      rows.map((row) => indexPatternMock.flattenHit(row))
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
    expect(component.html()).toMatchInlineSnapshot(
      `"<dl class=\\"euiDescriptionList euiDescriptionList--inline euiDescriptionList--compressed\\"><dt class=\\"euiDescriptionList__title\\">bytes</dt><dd class=\\"euiDescriptionList__description\\">100</dd></dl>"`
    );
  });

  it('renders _source column correctly when isDetails is set to true', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rows,
      rows.map((row) => indexPatternMock.flattenHit(row))
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
        &quot;bytes&quot;: 100
      }</span>"
    `);
  });

  it('renders correctly when invalid row is given', () => {
    const DiscoverGridCellValue = getRenderCellValueFn(
      indexPatternMock,
      rows,
      rows.map((row) => indexPatternMock.flattenHit(row))
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
      rows,
      rows.map((row) => indexPatternMock.flattenHit(row))
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
