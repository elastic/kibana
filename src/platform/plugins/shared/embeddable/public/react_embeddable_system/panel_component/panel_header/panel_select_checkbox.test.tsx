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
import { PanelSelectCheckbox } from './panel_select_checkbox';

describe('PanelSelectCheckbox', () => {
  it('offers to select an unselected panel', () => {
    render(<PanelSelectCheckbox panelId="panel1" isSelected={false} onToggle={jest.fn()} />);

    const checkbox = screen.getByTestId('embeddablePanelSelectToggle');
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveAccessibleName('Select panel');
  });

  it('offers to deselect a selected panel', () => {
    render(<PanelSelectCheckbox panelId="panel1" isSelected={true} onToggle={jest.fn()} />);

    const checkbox = screen.getByTestId('embeddablePanelSelectToggle');
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveAccessibleName('Deselect panel');
  });

  it('calls onToggle when clicked', async () => {
    const onToggle = jest.fn();
    render(<PanelSelectCheckbox panelId="panel1" isSelected={false} onToggle={onToggle} />);

    await userEvent.click(screen.getByTestId('embeddablePanelSelectToggle'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
