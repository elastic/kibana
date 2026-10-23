/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManagedEditorFooter } from './managed_editor_footer';
import type { ManagedEditorFooterProps } from './managed_editor_footer';

const renderFooter = (props: Partial<ManagedEditorFooterProps> = {}) => {
  const onCancel = jest.fn();
  const onSave = jest.fn();
  render(
    <ManagedEditorFooter
      onCancel={onCancel}
      onSave={onSave}
      saveButtonLabel="Save"
      cancelButtonDataTestSubj="cancel"
      saveButtonDataTestSubj="save"
      {...props}
    />
  );
  return { onCancel, onSave };
};

describe('ManagedEditorFooter', () => {
  it('calls onCancel and onSave', async () => {
    const { onCancel, onSave } = renderFooter();

    await userEvent.click(screen.getByTestId('cancel'));
    await userEvent.click(screen.getByTestId('save'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('only renders the preview button when a preview action is provided', async () => {
    renderFooter();
    expect(screen.queryByText('Run preview')).not.toBeInTheDocument();
  });

  it('runs the preview and respects isEnabled', async () => {
    const onPreview = jest.fn();
    renderFooter({
      previewAction: { onPreview, isEnabled: true, 'data-test-subj': 'preview' },
    });

    await userEvent.click(screen.getByTestId('preview'));
    expect(onPreview).toHaveBeenCalledTimes(1);
  });

  it('disables the preview button when the preview action is not enabled', () => {
    renderFooter({
      previewAction: { onPreview: jest.fn(), isEnabled: false, 'data-test-subj': 'preview' },
    });

    expect(screen.getByTestId('preview')).toBeDisabled();
  });

  it('disables save when isSaveDisabled is set', () => {
    renderFooter({ isSaveDisabled: true });
    expect(screen.getByTestId('save')).toBeDisabled();
  });

  it('hides the save action when hideSave is set', () => {
    renderFooter({ hideSave: true });
    expect(screen.queryByTestId('save')).not.toBeInTheDocument();
    expect(screen.getByTestId('cancel')).toBeInTheDocument();
  });

  describe('with a save menu', () => {
    it('saves from the primary segment without opening the menu', async () => {
      const onMenuItemClick = jest.fn();
      const { onSave } = renderFooter({
        saveMenuItems: [{ name: 'Save as new…', onClick: onMenuItemClick, 'data-test-subj': 'as' }],
      });

      await userEvent.click(screen.getByTestId('savePrimary'));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onMenuItemClick).not.toHaveBeenCalled();
      expect(screen.queryByTestId('as')).not.toBeInTheDocument();
    });

    it('runs a menu item and closes the menu', async () => {
      const onMenuItemClick = jest.fn();
      const { onSave } = renderFooter({
        saveMenuItems: [{ name: 'Save as new…', onClick: onMenuItemClick, 'data-test-subj': 'as' }],
      });

      await userEvent.click(screen.getByTestId('saveMenu'));
      // The menu's popover ignores pointer events while it animates in.
      fireEvent.click(await screen.findByTestId('as'));

      expect(onMenuItemClick).toHaveBeenCalledTimes(1);
      expect(onSave).not.toHaveBeenCalled();
    });

    it('disables the primary segment when save is disabled', () => {
      renderFooter({
        isSaveDisabled: true,
        saveMenuItems: [{ name: 'Save as new…', onClick: jest.fn() }],
      });

      expect(screen.getByTestId('savePrimary')).toBeDisabled();
    });
  });
});
