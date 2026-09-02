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
  const renderFlyout = (
    {
      isByReference = false,
      isNewPanel = false,
    }: { isByReference?: boolean; isNewPanel?: boolean } = {}
  ) => {
    const closeFlyout = jest.fn();
    const onRevert = jest.fn();
    const onPreview = jest.fn();
    const onSave = jest.fn();
    const { unmount } = render(
      <VegaEditorFlyout
        ariaLabelledBy="vega-flyout-title"
        closeFlyout={closeFlyout}
        initialSpec={{ format: 'hjson', value: '{ mark: point }' }}
        isByReference={isByReference}
        isNewPanel={isNewPanel}
        onPreview={onPreview}
        onRevert={onRevert}
        onSave={onSave}
      />
    );
    return { closeFlyout, onRevert, onPreview, onSave, unmount };
  };

  it('does not preview while typing; Preview pushes the current spec', async () => {
    const { onPreview } = renderFlyout();
    const user = userEvent.setup();

    expect(screen.getByRole('heading', { name: 'Vega' })).toBeInTheDocument();
    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    const previewButton = screen.getByTestId('vegaEditorFlyoutPreviewButton');

    // Preview is disabled until the spec differs from what is rendered on the panel.
    expect(previewButton).toBeDisabled();

    await user.clear(editor);
    await user.paste('{ mark: bar }');
    // Editing must not trigger the preview (no queries run on keystrokes).
    expect(onPreview).not.toHaveBeenCalled();
    expect(previewButton).toBeEnabled();

    await user.click(previewButton);
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledWith({ format: 'hjson', value: '{ mark: bar }' });
    // After previewing, Preview is disabled again until further edits.
    expect(previewButton).toBeDisabled();
  });

  it('disables Apply and close until an existing panel has real changes', async () => {
    renderFlyout();
    const user = userEvent.setup();

    // No edits yet → nothing to save.
    expect(screen.getByTestId('vegaEditorFlyoutSaveButton')).toBeDisabled();

    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    await user.clear(editor);
    await user.paste('{ mark: bar }');
    expect(screen.getByTestId('vegaEditorFlyoutSaveButton')).toBeEnabled();

    // Editing back to the original spec disables Save again.
    await user.clear(editor);
    await user.paste('{ mark: point }');
    expect(screen.getByTestId('vegaEditorFlyoutSaveButton')).toBeDisabled();
  });

  it('enables Apply and close for a new panel so its default spec can be accepted', () => {
    renderFlyout({ isNewPanel: true });
    expect(screen.getByTestId('vegaEditorFlyoutSaveButton')).toBeEnabled();
  });

  it('labels the action Save and close for a by-reference panel', () => {
    renderFlyout({ isByReference: true });
    expect(screen.getByRole('button', { name: 'Save and close' })).toBeInTheDocument();
  });

  it('saves the current spec, closes, and does not revert on unmount', async () => {
    const { closeFlyout, onPreview, onRevert, onSave, unmount } = renderFlyout();
    const user = userEvent.setup();

    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    await user.clear(editor);
    await user.paste('{ mark: bar }');

    await user.click(screen.getByTestId('vegaEditorFlyoutSaveButton'));
    expect(onSave).toHaveBeenCalledWith({ format: 'hjson', value: '{ mark: bar }' });
    expect(closeFlyout).toHaveBeenCalledTimes(1);
    // Save persists directly; it does not depend on a prior Preview.
    expect(onPreview).not.toHaveBeenCalled();

    // Unmounting after a Save must not revert the committed spec.
    unmount();
    expect(onRevert).not.toHaveBeenCalled();
  });

  it('reverts to the pre-edit state on unmount when not applied (e.g. Esc / click-away)', async () => {
    const { onRevert, unmount } = renderFlyout();
    const user = userEvent.setup();

    const editor = screen.getByRole('textbox', { name: 'Vega spec' });
    await user.clear(editor);
    await user.paste('{ mark: bar }');
    await user.click(screen.getByTestId('vegaEditorFlyoutPreviewButton')); // previewed but not saved

    unmount();
    expect(onRevert).toHaveBeenCalledTimes(1);
  });

  it('closes the flyout when Cancel is clicked (revert happens on the ensuing unmount)', async () => {
    const { closeFlyout, onSave, onRevert } = renderFlyout();
    const user = userEvent.setup();

    await user.click(screen.getByTestId('vegaEditorFlyoutCancelButton'));
    expect(closeFlyout).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    // Cancel only closes; the revert is driven by unmount, not the button.
    expect(onRevert).not.toHaveBeenCalled();
  });
});
