/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { fireEvent, render, screen } from '@testing-library/react';
import type { PanelEditFlyoutProps, PanelSettingsApi } from '@kbn/embeddable-plugin/public';
import { MarkdownSettingsFlyout } from './markdown_settings_flyout';

jest.mock('@kbn/embeddable-plugin/public', () => ({
  PanelEditFlyout: ({
    title,
    preview,
    panelOptions,
    hasPanelOptionsChanges,
    onApplyPanelOptions,
  }: PanelEditFlyoutProps) => (
    <div>
      <h2>{title}</h2>
      {preview ? <div data-test-subj="preview" /> : null}
      {panelOptions}
      <button disabled={!hasPanelOptionsChanges} onClick={onApplyPanelOptions}>
        apply
      </button>
    </div>
  ),
}));

const api: PanelSettingsApi = {
  title$: new BehaviorSubject<string | undefined>('Notes'),
  hideTitle$: new BehaviorSubject<boolean | undefined>(undefined),
  description$: new BehaviorSubject<string | undefined>(undefined),
  hideBorder$: new BehaviorSubject<boolean | undefined>(undefined),
  setTitle: jest.fn(),
  setHideTitle: jest.fn(),
  setDescription: jest.fn(),
  setHideBorder: jest.fn(),
};

const renderFlyout = (onApplySettings = jest.fn()) => {
  render(
    <MarkdownSettingsFlyout
      api={api}
      settings={{ open_links_in_new_tab: false }}
      onApplySettings={onApplySettings}
      closeFlyout={jest.fn()}
      ariaLabelledBy="markdownSettingsFlyoutTitleId"
    />
  );
  return { onApplySettings };
};

describe('MarkdownSettingsFlyout', () => {
  it('renders the settings without a preview', () => {
    renderFlyout();
    expect(screen.getByRole('heading', { name: 'Markdown settings' })).toBeInTheDocument();
    expect(screen.queryByTestId('preview')).not.toBeInTheDocument();
    expect(screen.getByTestId('openLinksInNewTabSwitch')).not.toBeChecked();
  });

  it('applies the open links in new tab setting', () => {
    const { onApplySettings } = renderFlyout();
    expect(screen.getByRole('button', { name: 'apply' })).toBeDisabled();
    fireEvent.click(screen.getByTestId('openLinksInNewTabSwitch'));
    fireEvent.click(screen.getByRole('button', { name: 'apply' }));
    expect(onApplySettings).toHaveBeenCalledWith({ open_links_in_new_tab: true });
  });
});
