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
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { createTableVisCell } from './table_vis_cell';
import type { FormattedColumns } from '../types';

describe('table vis cell', () => {
  it('should return a cell component with FormattedValue', () => {
    const rows = [{ first: 1, second: 2 }];
    const mockFormatter = {
      convert: jest.fn(),
      convertToReact: jest.fn(),
      hasReactSupport: jest.fn().mockReturnValue(true),
    };
    const formattedColumns = {
      second: {
        formatter: mockFormatter,
      },
    } as unknown as FormattedColumns;
    const Cell = createTableVisCell(rows, formattedColumns);
    const cellProps = {
      rowIndex: 0,
      columnId: 'second',
    } as EuiDataGridCellValueElementProps;

    const comp = shallow(<Cell {...cellProps} />);

    expect(comp).toMatchSnapshot();
    expect(comp.find('FormattedValue').exists()).toBe(true);
    expect(comp.find('FormattedValue').prop('fieldFormat')).toBe(mockFormatter);
    expect(comp.find('FormattedValue').prop('value')).toBe(2);
  });

  it('should handle missing column gracefully', () => {
    const rows = [{ first: 1 }];
    const formattedColumns = {} as unknown as FormattedColumns;
    const Cell = createTableVisCell(rows, formattedColumns);
    const cellProps = {
      rowIndex: 0,
      columnId: 'second',
    } as EuiDataGridCellValueElementProps;

    const comp = shallow(<Cell {...cellProps} />);

    expect(comp.find('FormattedValue').exists()).toBe(false);
  });
});
