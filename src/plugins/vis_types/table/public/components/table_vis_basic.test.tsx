/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { TableVisBasic } from './table_vis_basic';
import { FormattedColumn, TableVisConfig, TableVisUiState } from '../types';
import { DatatableColumn } from 'src/plugins/expressions';
import { createTableVisCell } from './table_vis_cell';
import { createGridColumns } from './table_vis_columns';

jest.mock('./table_vis_columns', () => ({
  createGridColumns: jest.fn(() => []),
}));
jest.mock('./table_vis_cell', () => ({
  createTableVisCell: jest.fn(() => () => {}),
}));

describe('TableVisBasic', () => {
  const props = {
    fireEvent: jest.fn(),
    table: {
      columns: [],
      rows: [],
      formattedColumns: {
        test: {
          formattedTotal: 100,
        } as FormattedColumn,
      },
    },
    visConfig: {} as TableVisConfig,
    uiStateProps: {
      sort: {
        columnIndex: null,
        direction: null,
      },
      columnsWidth: [],
      setColumnsWidth: jest.fn(),
      setSort: jest.fn(),
    },
  };

  it('should init data grid', () => {
    const comp = shallow(<TableVisBasic {...props} />);
    expect(comp).toMatchSnapshot();
  });

  it('should init data grid with title provided - for split mode', () => {
    const title = 'My data table';
    const comp = shallow(<TableVisBasic {...props} title={title} />);
    expect(comp).toMatchSnapshot();
  });

  it('should render the toolbar', () => {
    const comp = shallow(
      <TableVisBasic
        {...props}
        visConfig={{ ...props.visConfig, title: 'My saved vis', showToolbar: true }}
      />
    );
    expect(comp).toMatchSnapshot();
  });

  it('should sort rows by column and pass the sorted rows for consumers', () => {
    (createTableVisCell as jest.Mock).mockClear();
    const uiStateProps = {
      ...props.uiStateProps,
      sort: {
        columnIndex: 1,
        direction: 'desc',
      } as TableVisUiState['sort'],
    };
    const table = {
      columns: [{ id: 'first' }, { id: 'second' }] as DatatableColumn[],
      rows: [
        { first: 1, second: 2 },
        { first: 3, second: 4 },
        { first: 5, second: 6 },
      ],
      formattedColumns: {},
    };
    const sortedRows = [
      { first: 5, second: 6 },
      { first: 3, second: 4 },
      { first: 1, second: 2 },
    ];
    const comp = shallow(
      <TableVisBasic
        {...props}
        table={table}
        uiStateProps={uiStateProps}
        visConfig={{ ...props.visConfig, showToolbar: true }}
      />
    );
    expect(createTableVisCell).toHaveBeenCalledWith(sortedRows, table.formattedColumns, undefined);
    expect(createGridColumns).toHaveBeenCalledWith(
      table.columns,
      sortedRows,
      table.formattedColumns,
      uiStateProps.columnsWidth,
      props.fireEvent,
      undefined
    );

    const { onSort } = comp.find('EuiDataGrid').prop('sorting');
    // sort the first column
    onSort([{ id: 'first', direction: 'asc' }]);
    expect(uiStateProps.setSort).toHaveBeenCalledWith({ columnIndex: 0, direction: 'asc' });
    // sort the second column - should erase the first column sorting since there is only one level sorting available
    onSort([
      { id: 'first', direction: 'asc' },
      { id: 'second', direction: 'desc' },
    ]);
    expect(uiStateProps.setSort).toHaveBeenCalledWith({ columnIndex: 1, direction: 'desc' });
  });

  it('should pass renderFooterCellValue for the total row', () => {
    const comp = shallow(
      <TableVisBasic {...props} visConfig={{ ...props.visConfig, showTotal: true }} />
    );
    const renderFooterCellValue: (props: any) => void = comp
      .find('EuiDataGrid')
      .prop('renderFooterCellValue');
    expect(renderFooterCellValue).toEqual(expect.any(Function));
    expect(renderFooterCellValue({ columnId: 'test' })).toEqual(100);
  });
});
