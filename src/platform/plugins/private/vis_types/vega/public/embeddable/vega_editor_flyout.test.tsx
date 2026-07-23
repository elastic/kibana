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
import { VegaEditorFlyout } from './vega_editor_flyout';

jest.mock('../components/vega_vis_editor', () => ({
  VegaSpecEditor: ({
    editorValue,
    onChange,
  }: {
    editorValue: string;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="Vega spec"
      value={editorValue}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

describe('VegaEditorFlyout', () => {
  const renderFlyout = () => {
    const closeFlyout = jest.fn();
    const onCancel = jest.fn();
    const onApply = jest.fn();
    const onSave = jest.fn();
    render(
      <VegaEditorFlyout
        ariaLabelledBy="vega-flyout-title"
        closeFlyout={closeFlyout}
        initialSpec="{ mark: point }"
        onApply={onApply}
        onCancel={onCancel}
        onSave={onSave}
      />
    );
    return { closeFlyout, onCancel, onApply, onSave };
  };

  it('does not apply the preview while typing; Apply pushes the current spec', async () => {
    const { onApply } = renderFlyout();
    const user = userEvent.setup();

    expect(screen.getByRole('heading', { name: 'Vega' })).toBeInTheDocument();
    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    const applyButton = screen.getByRole('button', { name: 'Apply' });

    // Apply is disabled until the spec differs from what was last applied.
    expect(applyButton).toBeDisabled();

    await user.clear(editor);
    await user.paste('{ mark: bar }');
    // Editing must not trigger the preview (no queries run on keystrokes).
    expect(onApply).not.toHaveBeenCalled();
    expect(applyButton).toBeEnabled();

    await user.click(applyButton);
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith('{ mark: bar }');
    // After applying, Apply is disabled again until further edits.
    expect(applyButton).toBeDisabled();
  });

  it('saves the current spec and closes without requiring Apply', async () => {
    const { closeFlyout, onApply, onSave } = renderFlyout();
    const user = userEvent.setup();

    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    await user.clear(editor);
    await user.paste('{ mark: bar }');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith('{ mark: bar }');
    expect(closeFlyout).toHaveBeenCalledTimes(1);
    // Save persists directly; it does not depend on a prior Apply.
    expect(onApply).not.toHaveBeenCalled();
  });

  it('delegates cancellation without saving', async () => {
    const { closeFlyout, onCancel, onSave } = renderFlyout();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(closeFlyout).not.toHaveBeenCalled();
  });
});
