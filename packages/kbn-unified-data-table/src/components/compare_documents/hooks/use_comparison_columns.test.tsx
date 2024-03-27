/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  DEFAULT_COLUMN_WIDTH,
  FIELD_COLUMN_NAME,
  FIELD_COLUMN_WIDTH,
  useComparisonColumns,
} from './use_comparison_columns';
import { renderHook } from '@testing-library/react-hooks';
import type { EuiDataGridColumn, EuiDataGridColumnActions } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';

type DataGridColumn = Partial<Omit<EuiDataGridColumn, 'actions'>> &
  Pick<EuiDataGridColumn, 'id' | 'displayAsText'> & {
    actions?: Partial<Omit<EuiDataGridColumnActions, 'additional'>>;
  };

const getComparisonColumn = ({
  column,
  includePinAction,
  includeRemoveAction,
}: {
  column: DataGridColumn;
  includePinAction?: boolean;
  includeRemoveAction?: boolean;
}): EuiDataGridColumn => {
  const additional: EuiDataGridColumnActions['additional'] = [];
  if (includePinAction) {
    additional.push({
      iconType: 'pin',
      label: 'Pin for comparison',
      size: 'xs',
      onClick: expect.any(Function),
    });
  }
  if (includeRemoveAction) {
    additional.push({
      iconType: 'cross',
      label: 'Remove from comparison',
      size: 'xs',
      onClick: expect.any(Function),
    });
  }
  return {
    display: undefined,
    initialWidth: DEFAULT_COLUMN_WIDTH,
    isSortable: false,
    isExpandable: false,
    ...column,
    actions: {
      showHide: false,
      showMoveLeft: false,
      showMoveRight: false,
      showSortAsc: false,
      showSortDesc: false,
      ...column.actions,
      additional,
    },
  };
};

const fieldColumnId = 'fieldColumnId';
const selectedDocs = ['0', '1', '2', '3'];

const renderColumns = ({
  wrapperWidth,
  isPlainRecord = false,
}: { wrapperWidth?: number; isPlainRecord?: boolean } = {}) => {
  const wrapper = document.createElement('div');
  if (wrapperWidth) {
    Object.defineProperty(wrapper, 'offsetWidth', { value: wrapperWidth });
  }
  const setSelectedDocs = jest.fn();
  const {
    result: { current: columns },
  } = renderHook(() =>
    useComparisonColumns({
      wrapper,
      isPlainRecord,
      fieldColumnId,
      selectedDocs,
      setSelectedDocs,
    })
  );
  return { columns, setSelectedDocs };
};

describe('useComparisonColumns', () => {
  it('should return comparison columns', () => {
    const { columns, setSelectedDocs } = renderColumns();
    expect(columns).toEqual([
      {
        id: fieldColumnId,
        displayAsText: FIELD_COLUMN_NAME,
        initialWidth: FIELD_COLUMN_WIDTH,
        isSortable: false,
        isExpandable: false,
        actions: false,
      },
      getComparisonColumn({
        column: {
          id: selectedDocs[0],
          display: expect.anything(),
          displayAsText: selectedDocs[0],
        },
        includeRemoveAction: true,
      }),
      getComparisonColumn({
        column: {
          id: selectedDocs[1],
          displayAsText: selectedDocs[1],
          actions: {
            showMoveRight: true,
          },
        },
        includePinAction: true,
        includeRemoveAction: true,
      }),
      getComparisonColumn({
        column: {
          id: selectedDocs[2],
          displayAsText: selectedDocs[2],
          actions: {
            showMoveLeft: true,
            showMoveRight: true,
          },
        },
        includePinAction: true,
        includeRemoveAction: true,
      }),
      getComparisonColumn({
        column: {
          id: selectedDocs[3],
          displayAsText: selectedDocs[3],
          actions: {
            showMoveLeft: true,
          },
        },
        includePinAction: true,
        includeRemoveAction: true,
      }),
    ]);
    expect(columns[1].display).toMatchInlineSnapshot(`
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        responsive={false}
      >
        <EuiFlexItem
          grow={false}
        >
          <EuiIcon
            type="pinFilled"
          />
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
        >
          0
        </EuiFlexItem>
      </EuiFlexGroup>
    `);
    const actions = columns[2].actions as EuiDataGridColumnActions;
    const pinAction = actions.additional?.[0].onClick;
    const removeAction = actions.additional?.[1].onClick;
    render(<button onClick={pinAction} data-test-subj="pin" />);
    userEvent.click(screen.getByTestId('pin'));
    expect(setSelectedDocs).toHaveBeenCalledTimes(1);
    expect(setSelectedDocs).toHaveBeenCalledWith(['1', '0', '2', '3']);
    render(<button onClick={removeAction} data-test-subj="remove" />);
    userEvent.click(screen.getByTestId('remove'));
    expect(setSelectedDocs).toHaveBeenCalledTimes(2);
    expect(setSelectedDocs).toHaveBeenCalledWith(['0', '2', '3']);
  });

  it('should not set column widths if there is sufficient space', () => {
    const { columns } = renderColumns({
      wrapperWidth: FIELD_COLUMN_WIDTH + selectedDocs.length * DEFAULT_COLUMN_WIDTH,
    });
    expect(columns[0].initialWidth).toBe(FIELD_COLUMN_WIDTH);
    expect(columns[1].initialWidth).toBe(undefined);
    expect(columns[2].initialWidth).toBe(undefined);
    expect(columns[3].initialWidth).toBe(undefined);
    expect(columns[4].initialWidth).toBe(undefined);
  });

  it('should use result column display for plain records', () => {
    const { columns } = renderColumns({ isPlainRecord: true });
    expect(columns[1].displayAsText).toBe('Result 1');
    expect(columns[2].displayAsText).toBe('Result 2');
    expect(columns[3].displayAsText).toBe('Result 3');
    expect(columns[4].displayAsText).toBe('Result 4');
  });
});
