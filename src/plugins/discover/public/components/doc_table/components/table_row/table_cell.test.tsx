/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { CellProps, TableCell } from './table_cell';

const mountComponent = (props: Omit<CellProps, 'inlineFilter'>) => {
  return mount(<TableCell {...props} inlineFilter={() => {}} />);
};

describe('Doc table cell component', () => {
  test('renders a cell without filter buttons if it is not filterable', () => {
    const component = mountComponent({
      filterable: false,
      column: 'foo',
      timefield: true,
      sourcefield: false,
      formatted: <span>formatted content</span>,
    });
    expect(component).toMatchSnapshot();
  });

  it('renders a cell with filter buttons if it is filterable', () => {
    expect(
      mountComponent({
        filterable: true,
        column: 'foo',
        timefield: true,
        sourcefield: false,
        formatted: <span>formatted content</span>,
      })
    ).toMatchSnapshot();
  });

  it('renders a sourcefield', () => {
    expect(
      mountComponent({
        filterable: false,
        column: 'foo',
        timefield: false,
        sourcefield: true,
        formatted: <span>formatted content</span>,
      })
    ).toMatchSnapshot();
  });

  it('renders a field that is neither a timefield or sourcefield', () => {
    expect(
      mountComponent({
        filterable: false,
        column: 'foo',
        timefield: false,
        sourcefield: false,
        formatted: <span>formatted content</span>,
      })
    ).toMatchSnapshot();
  });
});
