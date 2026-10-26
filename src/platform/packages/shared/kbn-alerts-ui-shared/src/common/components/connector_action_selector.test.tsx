/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConnectorActionDef } from '../apis/fetch_connector_spec';
import { ConnectorActionSelector } from './connector_action_selector';

// 12 actions → 2 pages at default page size; zero-padded so lex sort = numeric sort.
const ACTIONS: ConnectorActionDef[] = Array.from({ length: 12 }, (_, i) => ({
  name: `action${String(i + 1).padStart(2, '0')}`,
  description: `Description ${i + 1}`,
  isTool: true,
}));

function Fixture({
  initialSelected,
  onValueChange,
}: {
  initialSelected: string[] | null;
  onValueChange?: (value: string[] | null) => void;
}) {
  const [value, setValue] = useState<string[] | null>(initialSelected);
  const errorMessage =
    Array.isArray(value) && value.length === 0
      ? 'Select at least one action, or enable All.'
      : undefined;
  return (
    <ConnectorActionSelector
      value={value}
      onChange={(next) => {
        setValue(next);
        onValueChange?.(next);
      }}
      actions={ACTIONS}
      readOnly={false}
      errorMessage={errorMessage}
    />
  );
}

function rowCheckbox(actionName: string) {
  const row = screen.getByTestId(`connectorActionSelectorRow-${actionName}`);
  return within(row).getByRole('checkbox');
}

describe('ConnectorActionSelector — cross-page selection', () => {
  it('preserves page-1 selections after navigating to page 2 and back', async () => {
    const user = userEvent.setup();

    render(<Fixture initialSelected={['action01', 'action02']} />);

    expect(rowCheckbox('action01')).toBeChecked();
    expect(rowCheckbox('action02')).toBeChecked();
    expect(rowCheckbox('action03')).not.toBeChecked();

    await user.click(screen.getByTestId('pagination-button-next'));

    expect(screen.getByTestId('connectorActionSelectorRow-action11')).toBeTruthy();
    expect(rowCheckbox('action11')).not.toBeChecked();
    expect(rowCheckbox('action12')).not.toBeChecked();

    await user.click(screen.getByTestId('pagination-button-previous'));

    // regression: page-1 selections must survive a page-2 round-trip
    expect(rowCheckbox('action01')).toBeChecked();
    expect(rowCheckbox('action02')).toBeChecked();
    expect(rowCheckbox('action03')).not.toBeChecked();
  });

  it('merges page-2 selections with existing page-1 selections', async () => {
    const user = userEvent.setup();

    render(<Fixture initialSelected={['action01', 'action02']} />);

    await user.click(screen.getByTestId('pagination-button-next'));
    await user.click(rowCheckbox('action11'));

    await user.click(screen.getByTestId('pagination-button-previous'));
    expect(rowCheckbox('action01')).toBeChecked();
    expect(rowCheckbox('action02')).toBeChecked();

    await user.click(screen.getByTestId('pagination-button-next'));
    expect(rowCheckbox('action11')).toBeChecked();
    expect(rowCheckbox('action12')).not.toBeChecked();
  });

  it('counter reflects total selected across all pages', async () => {
    const user = userEvent.setup();

    render(<Fixture initialSelected={['action01', 'action02']} />);

    expect(screen.getByText('2 selected')).toBeInTheDocument();

    await user.click(screen.getByTestId('pagination-button-next'));
    await user.click(rowCheckbox('action11'));

    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });
});

describe('ConnectorActionSelector — mode switching', () => {
  it('preserves a specific selection when toggling All → Custom', async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();

    render(<Fixture initialSelected={['action01', 'action03']} onValueChange={onValueChange} />);

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(onValueChange).toHaveBeenLastCalledWith(null);

    await user.click(screen.getByRole('button', { name: 'Custom' }));
    expect(onValueChange).toHaveBeenLastCalledWith(['action01', 'action03']);
    expect(rowCheckbox('action01')).toBeChecked();
    expect(rowCheckbox('action03')).toBeChecked();
  });

  it('shows an error when custom mode has zero actions selected', async () => {
    const user = userEvent.setup();

    render(<Fixture initialSelected={['action01']} />);

    await user.click(screen.getByTestId('connectorActionSelectorClearSelection'));

    expect(screen.getByText('Select at least one action, or enable All.')).toBeInTheDocument();
  });
});
