/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { JSXElementConstructor, MutableRefObject } from 'react';
import {
  EuiButtonEmpty,
  EuiDataGridColumnCellActionProps,
  EuiDataGridRefProps,
  type EuiDataGridColumnCellAction,
} from '@elastic/eui';
import { render, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { makeAction } from '../mocks/helpers';
import {
  useDataGridColumnsCellActions,
  UseDataGridColumnsCellActionsProps,
} from './use_data_grid_column_cell_actions';

const action1 = makeAction('action-1', 'icon1', 1);
action1.execute = jest.fn();
const action2 = makeAction('action-2', 'icon2', 2);
action2.execute = jest.fn();
const actions = [action1, action2];
const mockGetActions = jest.fn(async () => actions);

jest.mock('../context/cell_actions_context', () => ({
  useCellActionsContext: () => ({ getActions: mockGetActions }),
}));
const fieldValues: Record<string, string[]> = {
  column1: ['0.0', '0.1', '0.2', '0.3'],
  column2: ['1.0', '1.1', '1.2', '1.3'],
};
const mockGetCellValue = jest.fn(
  (field: string, rowIndex: number) => fieldValues[field]?.[rowIndex % fieldValues[field].length]
);
const field1 = { name: 'column1', type: 'text', searchable: true, aggregatable: true };
const field2 = { name: 'column2', type: 'keyword', searchable: true, aggregatable: true };
const columns = [{ id: field1.name }, { id: field2.name }];

const mockCloseCellPopover = jest.fn();
const useDataGridColumnsCellActionsProps: UseDataGridColumnsCellActionsProps = {
  fields: [field1, field2],
  getCellValue: mockGetCellValue,
  triggerId: 'testTriggerId',
  metadata: { some: 'value' },
  dataGridRef: {
    current: { closeCellPopover: mockCloseCellPopover },
  } as unknown as MutableRefObject<EuiDataGridRefProps>,
};

const renderCellAction = (
  columnCellAction: EuiDataGridColumnCellAction,
  props: Partial<EuiDataGridColumnCellActionProps> = {}
) => {
  const CellAction = columnCellAction as JSXElementConstructor<EuiDataGridColumnCellActionProps>;
  return render(
    <CellAction
      Component={EuiButtonEmpty}
      colIndex={0}
      rowIndex={0}
      columnId={''}
      isExpanded={false}
      {...props}
    />
  );
};

describe('useDataGridColumnsCellActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return array with actions for each columns', async () => {
    const { result, waitForNextUpdate } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });
    expect(result.current).toHaveLength(columns.length);
    expect(result.current[0]).toHaveLength(1); // loader

    await waitForNextUpdate();

    expect(result.current).toHaveLength(columns.length);
    expect(result.current[0]).toHaveLength(actions.length);
  });

  it('should render cell actions loading state', async () => {
    const { result } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });
    await act(async () => {
      const cellAction = renderCellAction(result.current[0][0]);
      expect(cellAction.getByTestId('dataGridColumnCellAction-loading')).toBeInTheDocument();
    });
  });

  it('should call getCellValue with the proper params', async () => {
    const { result, waitForNextUpdate } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });

    await waitForNextUpdate();

    renderCellAction(result.current[0][0], { rowIndex: 0 });
    renderCellAction(result.current[0][1], { rowIndex: 1 });
    renderCellAction(result.current[1][0], { rowIndex: 0 });
    renderCellAction(result.current[1][1], { rowIndex: 1 });

    expect(mockGetCellValue).toHaveBeenCalledTimes(4);
    expect(mockGetCellValue).toHaveBeenCalledWith(field1.name, 0);
    expect(mockGetCellValue).toHaveBeenCalledWith(field1.name, 1);
    expect(mockGetCellValue).toHaveBeenCalledWith(field2.name, 0);
    expect(mockGetCellValue).toHaveBeenCalledWith(field2.name, 1);
  });

  it('should render the cell actions', async () => {
    const { result, waitForNextUpdate } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });

    await waitForNextUpdate();

    const cellAction1 = renderCellAction(result.current[0][0]);

    expect(cellAction1.getByTestId(`dataGridColumnCellAction-${action1.id}`)).toBeInTheDocument();
    expect(cellAction1.getByText(action1.getDisplayName())).toBeInTheDocument();

    const cellAction2 = renderCellAction(result.current[0][1]);

    expect(cellAction2.getByTestId(`dataGridColumnCellAction-${action2.id}`)).toBeInTheDocument();
    expect(cellAction2.getByText(action2.getDisplayName())).toBeInTheDocument();
  });

  it('should execute the action on click', async () => {
    const { result, waitForNextUpdate } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });
    await waitForNextUpdate();

    const cellAction = renderCellAction(result.current[0][0]);

    cellAction.getByTestId(`dataGridColumnCellAction-${action1.id}`).click();

    waitFor(() => {
      expect(action1.execute).toHaveBeenCalled();
    });
  });

  it('should execute the action with correct context', async () => {
    const { result, waitForNextUpdate } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });
    await waitForNextUpdate();

    const cellAction1 = renderCellAction(result.current[0][0], { rowIndex: 1 });

    cellAction1.getByTestId(`dataGridColumnCellAction-${action1.id}`).click();

    await waitFor(() => {
      expect(action1.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            {
              value: fieldValues[field1.name][1],
              field: {
                name: field1.name,
                type: field1.type,
                aggregatable: true,
                searchable: true,
              },
            },
          ],
          trigger: { id: useDataGridColumnsCellActionsProps.triggerId },
        })
      );
    });

    const cellAction2 = renderCellAction(result.current[1][1], { rowIndex: 2 });

    cellAction2.getByTestId(`dataGridColumnCellAction-${action2.id}`).click();

    await waitFor(() => {
      expect(action2.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            {
              value: fieldValues[field2.name][2],
              field: {
                name: field2.name,
                type: field2.type,
                aggregatable: true,
                searchable: true,
              },
            },
          ],
          trigger: { id: useDataGridColumnsCellActionsProps.triggerId },
        })
      );
    });
  });

  it('should execute the action with correct page value', async () => {
    const { result, waitForNextUpdate } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });
    await waitForNextUpdate();

    const cellAction = renderCellAction(result.current[0][0], { rowIndex: 25 });

    cellAction.getByTestId(`dataGridColumnCellAction-${action1.id}`).click();

    expect(mockGetCellValue).toHaveBeenCalledWith(field1.name, 25);

    await waitFor(() => {
      expect(action1.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            {
              value: fieldValues[field1.name][1],
              field: {
                name: field1.name,
                type: field1.type,
                aggregatable: true,
                searchable: true,
              },
            },
          ],
        })
      );
    });
  });

  it('should close popover then action executed', async () => {
    const { result, waitForNextUpdate } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });
    await waitForNextUpdate();

    const cellAction = renderCellAction(result.current[0][0], { rowIndex: 25 });

    cellAction.getByTestId(`dataGridColumnCellAction-${action1.id}`).click();

    await waitFor(() => {
      expect(mockCloseCellPopover).toHaveBeenCalled();
    });
  });

  it('should return empty array of actions when list of fields is empty', async () => {
    const { result, waitForNextUpdate } = renderHook(useDataGridColumnsCellActions, {
      initialProps: {
        ...useDataGridColumnsCellActionsProps,
        fields: [],
      },
    });

    await waitForNextUpdate();

    expect(result.current).toBeInstanceOf(Array);
    expect(result.current.length).toBe(0);
  });

  it('should return empty array of actions when list of fields is undefined', async () => {
    const { result, waitForNextUpdate } = renderHook(useDataGridColumnsCellActions, {
      initialProps: {
        ...useDataGridColumnsCellActionsProps,
        fields: undefined,
      },
    });

    await waitForNextUpdate();

    expect(result.current).toBeInstanceOf(Array);
    expect(result.current.length).toBe(0);
  });
});
