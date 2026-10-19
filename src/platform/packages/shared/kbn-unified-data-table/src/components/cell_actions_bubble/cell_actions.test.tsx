/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EuiDataGridColumnCellAction } from '@elastic/eui';
import { CellActionsPopoverFooter, getCellActionBubbleActions } from './cell_actions';

const cell = { rowIndex: 2, colIndex: 1, columnId: 'field' };

const onFilter = jest.fn();
const filterAction: EuiDataGridColumnCellAction = ({ Component, rowIndex, columnId }) => (
  <Component
    data-test-subj="filterAction"
    iconType="plusCircle"
    aria-label={`Filter ${columnId} ${rowIndex}`}
    onClick={() => onFilter(rowIndex)}
  >
    Filter for
  </Component>
);
const unnamedAction: EuiDataGridColumnCellAction = ({ Component }) => (
  <Component data-test-subj="unnamedAction" iconType="plusCircle" />
);

describe('getCellActionBubbleActions', () => {
  beforeEach(() => onFilter.mockClear());

  it('renders the cell actions as icon buttons with their label, followed by the expand button', () => {
    const onExpand = jest.fn();
    const actions = getCellActionBubbleActions({
      cellActions: [filterAction],
      cell,
      expand: { label: 'Expand cell', onExpand },
    });
    expect(actions.map(({ id }) => id)).toEqual(['cell-action-0', 'expand']);

    render(<>{actions.map(({ id, element }) => React.cloneElement(element, { key: id }))}</>);
    expect(screen.getByRole('button', { name: 'Filter field 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand cell' })).toBeInTheDocument();
  });

  it('runs the action and reports what the expand button was clicked on', async () => {
    const onExpand = jest.fn();
    const actions = getCellActionBubbleActions({
      cellActions: [filterAction],
      cell,
      expand: { label: 'Expand cell', onExpand },
    });
    render(<>{actions.map(({ id, element }) => React.cloneElement(element, { key: id }))}</>);

    await userEvent.click(screen.getByTestId('filterAction'));
    expect(onFilter).toHaveBeenCalledWith(2);
    await userEvent.click(screen.getByTestId('euiDataGridCellExpandButton'));
    expect(onExpand).toHaveBeenCalledWith(screen.getByTestId('euiDataGridCellExpandButton'));
  });

  it('has no expand button unless asked for, and skips actions without an accessible name', () => {
    const actions = getCellActionBubbleActions({ cellActions: [unnamedAction], cell });
    expect(actions.map(({ id }) => id)).toEqual(['cell-action-0']);
    render(<>{actions.map(({ id, element }) => React.cloneElement(element, { key: id }))}</>);
    expect(screen.queryByTestId('unnamedAction')).not.toBeInTheDocument();
    expect(screen.queryByTestId('euiDataGridCellExpandButton')).not.toBeInTheDocument();
  });
});

describe('CellActionsPopoverFooter', () => {
  it('renders nothing without cell actions', () => {
    const { container } = render(<CellActionsPopoverFooter cellActions={[]} cell={cell} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('reports a click on an enabled action after the action ran, but not on a disabled one', async () => {
    const onActionClick = jest.fn();
    const disabledAction: EuiDataGridColumnCellAction = ({ Component }) => (
      <Component data-test-subj="disabledAction" iconType="minusCircle" disabled>
        Filter out
      </Component>
    );
    onFilter.mockClear();
    render(
      <CellActionsPopoverFooter
        cellActions={[filterAction, disabledAction]}
        cell={cell}
        onActionClick={onActionClick}
      />
    );

    await userEvent.click(screen.getByTestId('disabledAction'));
    expect(onActionClick).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('filterAction'));
    expect(onFilter).toHaveBeenCalledWith(2);
    expect(onActionClick).toHaveBeenCalledTimes(1);
    expect(onFilter.mock.invocationCallOrder[0]).toBeLessThan(
      onActionClick.mock.invocationCallOrder[0]
    );
  });
});
