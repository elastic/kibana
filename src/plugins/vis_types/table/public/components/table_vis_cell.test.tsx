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
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { createTableVisCell } from './table_vis_cell';
import { FormattedColumns } from '../types';

describe('table vis cell', () => {
  it('should return a cell component with data in scope', () => {
    const rows = [{ first: 1, second: 2 }];
    const formattedColumns = {
      second: {
        formatter: {
          convert: jest.fn(),
        },
      },
    } as unknown as FormattedColumns;
    const Cell = createTableVisCell(rows, formattedColumns);
    const cellProps = {
      rowIndex: 0,
      columnId: 'second',
    } as EuiDataGridCellValueElementProps;

    const comp = shallow(<Cell {...cellProps} />);

    expect(comp).toMatchSnapshot();
    expect(formattedColumns.second.formatter.convert).toHaveBeenLastCalledWith(2, 'html');
  });
});
