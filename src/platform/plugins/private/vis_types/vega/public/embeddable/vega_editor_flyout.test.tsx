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
    const onChange = jest.fn();
    const onSave = jest.fn();
    render(
      <VegaEditorFlyout
        ariaLabelledBy="vega-flyout-title"
        closeFlyout={closeFlyout}
        initialSpec="{ mark: point }"
        onCancel={onCancel}
        onChange={onChange}
        onSave={onSave}
      />
    );
    return { closeFlyout, onCancel, onChange, onSave };
  };

  it('shows the initial spec and saves edited content', async () => {
    const { closeFlyout, onChange, onSave } = renderFlyout();
    const user = userEvent.setup();

    expect(screen.getByRole('heading', { name: 'Vega' })).toBeInTheDocument();
    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    expect(editor).toHaveValue('{ mark: point }');
    await user.clear(editor);
    await user.paste('{ mark: bar }');
    expect(onChange).toHaveBeenCalledWith('{ mark: bar }');

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith('{ mark: bar }');
    expect(closeFlyout).toHaveBeenCalledTimes(1);
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
