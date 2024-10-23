/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../utils', () => ({
  useUiState: jest.fn(() => ({
    columnsWidth: [
      { colIndex: 0, width: 77 },
      { colIndex: 1, width: 22 },
    ],
    sort: {
      columnIndex: null,
      direction: null,
    },
  })),
  usePagination: () => undefined,
}));

import React from 'react';
import { mount, shallow } from 'enzyme';
import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/common';
import { coreMock } from '@kbn/core/public/mocks';
import { FormattedColumns, TableVisConfig, TableVisData } from '../types';
import TableVisualizationComponent from './table_visualization';
import { useUiState } from '../utils';
import { TableVisSplit } from './table_vis_split';

describe('TableVisualizationComponent', () => {
  const coreStartMock = coreMock.createStart();
  const handlers = {
    done: jest.fn(),
    uiState: 'uiState',
    event: 'event',
  } as unknown as IInterpreterRenderHandlers;
  const visData: TableVisData = {
    table: {
      columns: [],
      rows: [],
      formattedColumns: {},
    },
    tables: [],
  };
  const renderComplete = jest.fn();
  const visConfig = {} as unknown as TableVisConfig;

  it('should render the basic table', () => {
    const comp = shallow(
      <TableVisualizationComponent
        core={coreStartMock}
        handlers={handlers}
        visData={visData}
        visConfig={visConfig}
        renderComplete={renderComplete}
      />
    );
    expect(useUiState).toHaveBeenLastCalledWith(handlers.uiState);
    expect(comp.find('.tbvChart__splitColumns').exists()).toBeFalsy();
  });

  it('should render split table', () => {
    const comp = shallow(
      <TableVisualizationComponent
        core={coreStartMock}
        handlers={handlers}
        visData={{
          direction: 'column',
          tables: [],
        }}
        visConfig={visConfig}
        renderComplete={renderComplete}
      />
    );
    expect(useUiState).toHaveBeenLastCalledWith(handlers.uiState);
    expect(comp.find('.tbvChart__splitColumns').exists()).toBeTruthy();
    expect(comp.find('.tbvChart__split').exists()).toBeFalsy();
    expect(comp.find('[data-test-subj="tbvChart"]').children().prop('tables')).toEqual([]);
  });

  it('should render split table and set minWidth for column split', () => {
    const comp = mount(
      <TableVisualizationComponent
        core={coreStartMock}
        handlers={handlers}
        visData={{
          direction: 'column',
          tables: [
            {
              title: 'One',
              table: {
                columns: [
                  { id: 'a', name: 'a', meta: { type: 'string' } },
                  { id: 'b', name: 'b', meta: { type: 'string' } },
                  { id: 'c', name: 'c', meta: { type: 'string' } },
                ],
                rows: [],
                formattedColumns: {
                  a: {},
                  b: {},
                  c: {},
                } as unknown as FormattedColumns,
              },
            },
            {
              title: 'Two',
              table: {
                columns: [
                  { id: 'a', name: 'a', meta: { type: 'string' } },
                  { id: 'b', name: 'b', meta: { type: 'string' } },
                  { id: 'c', name: 'c', meta: { type: 'string' } },
                ],
                rows: [],
                formattedColumns: {
                  a: {},
                  b: {},
                  c: {},
                } as unknown as FormattedColumns,
              },
            },
          ],
        }}
        visConfig={visConfig}
        renderComplete={renderComplete}
      />
    );
    const splits = comp.find(TableVisSplit).find('.tbvChart__split');
    expect(splits.length).toBe(2);
    splits.forEach((split) => {
      expect((split.prop('css') as { minWidth: string }).minWidth).toEqual(
        `calc(${77 + 22 + 25}px + 2 * 8px)`
      );
    });
  });
});
