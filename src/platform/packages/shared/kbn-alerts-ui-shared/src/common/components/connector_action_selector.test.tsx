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
import { ConnectorActionSelectorUI } from './connector_action_selector';

// 12 actions → 2 pages at default page size; zero-padded so lex sort = numeric sort.
const ACTIONS: ConnectorActionDef[] = Array.from({ length: 12 }, (_, i) => ({
  name: `action${String(i + 1).padStart(2, '0')}`,
  description: `Description ${i + 1}`,
  isTool: false,
}));
const ACTION_NAMES = ACTIONS.map((a) => a.name);

function Fixture({ initialSelected }: { initialSelected: string[] | null }) {
  const [value, setValue] = useState<string[] | null>(initialSelected);
  return (
    <ConnectorActionSelectorUI
      field={{ value, setValue }}
      actions={ACTIONS}
      allActionNames={ACTION_NAMES}
      readOnly={false}
    />
  );
}

function rowCheckbox(actionName: string) {
  const row = screen.getByTestId(`connectorActionSelectorRow-${actionName}`);
  return within(row).getByRole('checkbox');
}

describe('ConnectorActionSelectorUI — cross-page selection', () => {
  it('preserves page-1 selections after navigating to page 2 and back', async () => {
    const user = userEvent.setup();

    // Start with action01 and action02 selected (simulates editing a saved connector).
    render(<Fixture initialSelected={['action01', 'action02']} />);

    // Page 1: action01 and action02 should be checked.
    expect(rowCheckbox('action01')).toBeChecked();
    expect(rowCheckbox('action02')).toBeChecked();
    expect(rowCheckbox('action03')).not.toBeChecked();

    // Navigate to page 2 (EUI sets data-test-subj="pagination-button-next").
    await user.click(screen.getByTestId('pagination-button-next'));

    // Page 2 has action11 and action12 — neither should be checked.
    expect(screen.getByTestId('connectorActionSelectorRow-action11')).toBeTruthy();
    expect(rowCheckbox('action11')).not.toBeChecked();
    expect(rowCheckbox('action12')).not.toBeChecked();

    // Navigate back to page 1.
    await user.click(screen.getByTestId('pagination-button-previous'));

    // action01 and action02 must still be checked — this is the regression test.
    expect(rowCheckbox('action01')).toBeChecked();
    expect(rowCheckbox('action02')).toBeChecked();
    expect(rowCheckbox('action03')).not.toBeChecked();
  });

  it('merges page-2 selections with existing page-1 selections', async () => {
    const user = userEvent.setup();

    render(<Fixture initialSelected={['action01', 'action02']} />);

    // Navigate to page 2 and check action11.
    await user.click(screen.getByTestId('pagination-button-next'));
    await user.click(rowCheckbox('action11'));

    // Navigate back — page 1 selections must be intact.
    await user.click(screen.getByTestId('pagination-button-previous'));
    expect(rowCheckbox('action01')).toBeChecked();
    expect(rowCheckbox('action02')).toBeChecked();

    // Navigate forward again — page 2 selection must still be there.
    await user.click(screen.getByTestId('pagination-button-next'));
    expect(rowCheckbox('action11')).toBeChecked();
    expect(rowCheckbox('action12')).not.toBeChecked();
  });

  it('counter reflects total selected across all pages', async () => {
    const user = userEvent.setup();

    render(<Fixture initialSelected={['action01', 'action02']} />);

    // Counter shows total selected (2) on page 1.
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    // Navigate to page 2 and select action11.
    await user.click(screen.getByTestId('pagination-button-next'));
    await user.click(rowCheckbox('action11'));

    // Counter should now show 3 (cross-page total).
    expect(screen.getByText('3 selected')).toBeInTheDocument();
  });
});
