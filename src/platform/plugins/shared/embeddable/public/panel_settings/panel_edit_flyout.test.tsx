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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { PanelEditFlyout } from './panel_edit_flyout';
import type { PanelSettingsApi } from './types';

jest.mock('../kibana_services', () => ({
  core: { uiSettings: { get: jest.fn() } },
}));

const createApi = () =>
  ({
    title$: new BehaviorSubject<string | undefined>('My panel'),
    hideTitle$: new BehaviorSubject<boolean | undefined>(undefined),
    description$: new BehaviorSubject<string | undefined>(undefined),
    hideBorder$: new BehaviorSubject<boolean | undefined>(undefined),
    timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
    setTitle: jest.fn(),
    setHideTitle: jest.fn(),
    setDescription: jest.fn(),
    setHideBorder: jest.fn(),
    setTimeRange: jest.fn(),
  } satisfies PanelSettingsApi);

const renderFlyout = (overrides: Partial<React.ComponentProps<typeof PanelEditFlyout>> = {}) => {
  const props = {
    api: createApi(),
    title: 'Edit panel',
    preview: <div data-test-subj="myPreview" />,
    editorLinkLabel: 'Edit in editor',
    onNavigateToEditor: jest.fn(),
    closeFlyout: jest.fn(),
    ariaLabelledBy: 'panelEditFlyoutTitleId',
    ...overrides,
  };
  render(
    <EuiThemeProvider>
      <PanelEditFlyout {...props} />
    </EuiThemeProvider>
  );
  return props;
};

describe('PanelEditFlyout', () => {
  it('renders the title, the preview, the editor link and the panel settings', () => {
    renderFlyout();
    expect(screen.getByRole('heading', { name: 'Edit panel' })).toBeInTheDocument();
    expect(screen.getByTestId('myPreview')).toBeInTheDocument();
    expect(screen.getByTestId('panelEditFlyoutEditorLink')).toHaveTextContent('Edit in editor');
    expect(screen.getByText('Title and description')).toBeInTheDocument();
    expect(screen.getByText('Panel options')).toBeInTheDocument();
  });

  it('hides the editor link when the panel cannot be edited in its editor', () => {
    renderFlyout({ onNavigateToEditor: undefined });
    expect(screen.queryByTestId('panelEditFlyoutEditorLink')).not.toBeInTheDocument();
  });

  it('applies pending settings, closes and navigates from the editor link', async () => {
    const { api, closeFlyout, onNavigateToEditor } = renderFlyout();
    fireEvent.change(screen.getByTestId('customEmbeddablePanelTitleInput'), {
      target: { value: 'New title' },
    });
    fireEvent.click(screen.getByTestId('panelEditFlyoutEditorLink'));
    expect(api.setTitle).toHaveBeenCalledWith('New title');
    expect(closeFlyout).toHaveBeenCalled();
    await waitFor(() => expect(onNavigateToEditor).toHaveBeenCalled());
  });

  it('enables apply only after a change and applies on click', () => {
    const { api, closeFlyout } = renderFlyout();
    const applyButton = screen.getByTestId('panelEditFlyoutApplyButton');
    expect(applyButton).toBeDisabled();
    fireEvent.click(screen.getByTestId('customizePanelBorderlessToggle'));
    expect(applyButton).toBeEnabled();
    fireEvent.click(applyButton);
    expect(api.setHideBorder).toHaveBeenCalledWith(true);
    expect(closeFlyout).toHaveBeenCalled();
  });

  it('closes without applying on cancel', () => {
    const { api, closeFlyout } = renderFlyout();
    fireEvent.click(screen.getByTestId('customizePanelBorderlessToggle'));
    fireEvent.click(screen.getByTestId('panelEditFlyoutCancelButton'));
    expect(api.setHideBorder).not.toHaveBeenCalled();
    expect(closeFlyout).toHaveBeenCalled();
  });
});
