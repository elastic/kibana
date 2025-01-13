/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSXElementConstructor, MutableRefObject } from 'react';
import React from 'react';
import type { EuiDataGridColumnCellActionProps, EuiDataGridRefProps } from '@elastic/eui';
import { EuiButtonEmpty, type EuiDataGridColumnCellAction } from '@elastic/eui';
import { render, waitFor, renderHook } from '@testing-library/react';
import { makeAction } from '../mocks/helpers';
import type { UseDataGridColumnsCellActionsProps } from './use_data_grid_column_cell_actions';
import { useDataGridColumnsCellActions } from './use_data_grid_column_cell_actions';

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
    const { result } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });

    expect(result.current).toHaveLength(0);

    await waitFor(() => {
      expect(result.current).toHaveLength(columns.length);
      expect(result.current[0]).toHaveLength(actions.length);
    });
  });

  it('should call getCellValue with the proper params', async () => {
    const { result } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });

    await waitFor(() => {
      expect(result.current).toHaveLength(columns.length);
    });

    renderCellAction(result.current[0][0], { rowIndex: 0 });
    renderCellAction(result.current[0][1], { rowIndex: 1 });
    renderCellAction(result.current[1][0], { rowIndex: 0 });
    renderCellAction(result.current[1][1], { rowIndex: 1 });

    await waitFor(() => {
      expect(mockGetCellValue).toHaveBeenCalledTimes(4);
      expect(mockGetCellValue).toHaveBeenCalledWith(field1.name, 0);
      expect(mockGetCellValue).toHaveBeenCalledWith(field1.name, 1);
      expect(mockGetCellValue).toHaveBeenCalledWith(field2.name, 0);
      expect(mockGetCellValue).toHaveBeenCalledWith(field2.name, 1);
    });
  });

  it('should render the cell actions', async () => {
    const { result } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });

    await waitFor(() => {
      expect(result.current).toHaveLength(columns.length);
    });

    const cellAction1 = renderCellAction(result.current[0][0]);

    await waitFor(() => {
      expect(cellAction1.getByTestId(`dataGridColumnCellAction-${action1.id}`)).toBeInTheDocument();
      expect(cellAction1.getByText(action1.getDisplayName())).toBeInTheDocument();
    });

    const cellAction2 = renderCellAction(result.current[0][1]);

    await waitFor(() => {
      expect(cellAction2.getByTestId(`dataGridColumnCellAction-${action2.id}`)).toBeInTheDocument();
      expect(cellAction2.getByText(action2.getDisplayName())).toBeInTheDocument();
    });
  });

  it('should execute the action on click', async () => {
    const { result } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });

    await waitFor(() => {
      const cellAction = renderCellAction(result.current[0][0]);
      cellAction.getByTestId(`dataGridColumnCellAction-${action1.id}`).click();
    });

    await waitFor(() => {
      expect(action1.execute).toHaveBeenCalled();
    });
  });

  it('should execute the action with correct context', async () => {
    const { result } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });

    await waitFor(() => {
      expect(result.current).toHaveLength(columns.length);
    });

    const cellAction1 = renderCellAction(result.current[0][0], { rowIndex: 1 });

    cellAction1.getByTestId(`dataGridColumnCellAction-${action1.id}`).click();

    await waitFor(() => {
      expect(action1.execute).toHaveBeenCalledWith({
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
        metadata: {
          some: 'value',
        },
        nodeRef: expect.any(Object),
        trigger: { id: useDataGridColumnsCellActionsProps.triggerId },
      });
    });

    const cellAction2 = renderCellAction(result.current[1][1], { rowIndex: 2 });

    cellAction2.getByTestId(`dataGridColumnCellAction-${action2.id}`).click();

    await waitFor(() => {
      expect(action2.execute).toHaveBeenCalledWith({
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
        metadata: {
          some: 'value',
        },
        nodeRef: expect.any(Object),
        trigger: { id: useDataGridColumnsCellActionsProps.triggerId },
      });
    });
  });

  it('should execute the action with correct page value', async () => {
    const { result } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });

    await waitFor(() => {
      expect(result.current).toHaveLength(columns.length);
    });

    const cellAction = renderCellAction(result.current[0][0], { rowIndex: 25 });
    cellAction.getByTestId(`dataGridColumnCellAction-${action1.id}`).click();

    await waitFor(() => {
      expect(mockGetCellValue).toHaveBeenCalledWith(field1.name, 25);
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
    const { result } = renderHook(useDataGridColumnsCellActions, {
      initialProps: useDataGridColumnsCellActionsProps,
    });

    await waitFor(() => {
      expect(result.current).toHaveLength(columns.length);
    });

    const cellAction = renderCellAction(result.current[0][0], { rowIndex: 25 });
    cellAction.getByTestId(`dataGridColumnCellAction-${action1.id}`).click();

    await waitFor(() => {
      expect(mockCloseCellPopover).toHaveBeenCalled();
    });
  });

  it('should return empty array of actions when list of fields is empty', async () => {
    const { result } = renderHook(useDataGridColumnsCellActions, {
      initialProps: {
        ...useDataGridColumnsCellActionsProps,
        fields: [],
      },
    });

    await waitFor(() => {
      expect(result.current).toBeInstanceOf(Array);
      expect(result.current.length).toBe(0);
    });
  });

  it('should return empty array of actions when list of fields is undefined', async () => {
    const { result } = renderHook(useDataGridColumnsCellActions, {
      initialProps: {
        ...useDataGridColumnsCellActionsProps,
        fields: undefined,
      },
    });

    await waitFor(() => {
      expect(result.current).toBeInstanceOf(Array);
      expect(result.current.length).toBe(0);
    });
  });
});
