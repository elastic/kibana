/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('../utils', () => ({
  useUiState: jest.fn(() => 'uiState'),
}));

import React from 'react';
import { shallow } from 'enzyme';
import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin';
import { coreMock } from '@kbn/core/public/mocks';
import { TableVisConfig, TableVisData } from '../types';
import TableVisualizationComponent from './table_visualization';
import { useUiState } from '../utils';

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
  const visConfig = {} as unknown as TableVisConfig;

  it('should render the basic table', () => {
    const comp = shallow(
      <TableVisualizationComponent
        core={coreStartMock}
        handlers={handlers}
        visData={visData}
        visConfig={visConfig}
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
      />
    );
    expect(useUiState).toHaveBeenLastCalledWith(handlers.uiState);
    expect(comp.find('.tbvChart__splitColumns').exists()).toBeTruthy();
    expect(comp.find('.tbvChart__split').exists()).toBeFalsy();
    expect(comp.find('[data-test-subj="tbvChart"]').children().prop('tables')).toEqual([]);
  });
});
