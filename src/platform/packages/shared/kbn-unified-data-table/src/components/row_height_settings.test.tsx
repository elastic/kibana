/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { RowHeightSettings, RowHeightSettingsProps } from '../..';

const renderRowHeightSettings = ({ maxRowHeight }: { maxRowHeight?: number } = {}) => {
  const Wrapper = () => {
    const [rowHeight, setRowHeight] = useState<RowHeightSettingsProps['rowHeight']>();
    const [rowHeightLines, setRowHeightLines] = useState<number>();

    return (
      <RowHeightSettings
        label="Row height"
        rowHeight={rowHeight}
        rowHeightLines={rowHeightLines}
        maxRowHeight={maxRowHeight}
        onChangeRowHeight={setRowHeight}
        onChangeRowHeightLines={setRowHeightLines}
        data-test-subj="rowHeightSettings"
      />
    );
  };

  return render(<Wrapper />);
};

describe('RowHeightSettings', () => {
  it('should set rowHeight when the selected button changes', async () => {
    renderRowHeightSettings();
    expect(screen.getByRole('button', { name: 'Single', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auto fit', pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom', pressed: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Auto fit' }));
    expect(screen.getByRole('button', { name: 'Single', pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auto fit', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom', pressed: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(screen.getByRole('button', { name: 'Single', pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auto fit', pressed: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom', pressed: true })).toBeInTheDocument();
  });

  it('should show the range input when Custom is selected', async () => {
    renderRowHeightSettings();
    expect(screen.queryByRole('slider', { hidden: true })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(screen.getByRole('slider', { hidden: true })).toBeInTheDocument();
  });

  it('should set rowHeightLines when the range input changes', async () => {
    renderRowHeightSettings();
    await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
    const slider = screen.getByRole('slider', { hidden: true });
    expect(slider).toHaveValue('2');
    fireEvent.change(slider, { target: { value: 10 } });
    expect(slider).toHaveValue('10');
  });

  it('should limit the range input to the maxRowHeight', async () => {
    renderRowHeightSettings({ maxRowHeight: 5 });
    await userEvent.click(screen.getByRole('button', { name: 'Custom' }));
    const slider = screen.getByRole('slider', { hidden: true });
    expect(slider).toHaveValue('2');
    fireEvent.change(slider, { target: { value: 10 } });
    expect(slider).toHaveValue('5');
  });
});
