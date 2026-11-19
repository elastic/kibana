/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { EuiProvider, EuiThemeProvider } from '@elastic/eui';
import { HostColorModeContext } from '../../../toolbar/components/host_color_mode';
import { InspectButton } from './inspect_button';
import {
  isEscapeKey,
  isGrabKeyboardShortcut,
  isKeyboardShortcut,
} from '../../lib/keyboard_shortcut/keyboard_shortcut';
import { getInspectedElementData } from '../../lib/get_inspected_element_data';
import { setActiveMode } from '../../lib/active_mode';
import { INSPECT_FLYOUT_ID } from '../../lib/constants';
import { createMockHost, mockComponentData } from '../../__mocks__/mocks';
import type { InspectFlyout } from './flyout/inspect_flyout';

jest.mock('../../lib/keyboard_shortcut/keyboard_shortcut', () => ({
  isKeyboardShortcut: jest.fn(),
  isGrabKeyboardShortcut: jest.fn(),
  isEscapeKey: jest.fn(),
}));

jest.mock('../../lib/get_inspected_element_data', () => ({
  getInspectedElementData: jest.fn(),
}));

jest.mock('./flyout/inspect_flyout', () => ({
  InspectFlyout: ({ colorMode, onClose }: React.ComponentProps<typeof InspectFlyout>) => (
    <div data-test-subj="inspectComponentFlyout" data-color-mode={colorMode}>
      <button data-test-subj="mockFlyoutClose" onClick={onClose} />
    </div>
  ),
}));

const mockedIsKeyboardShortcut = jest.mocked(isKeyboardShortcut);
const mockedIsGrabKeyboardShortcut = jest.mocked(isGrabKeyboardShortcut);
const mockedGetInspectedElementData = jest.mocked(getInspectedElementData);

describe('InspectButton', () => {
  const host = createMockHost();

  beforeAll(() => {
    document.elementsFromPoint = jest
      .fn()
      .mockReturnValue([document.createElement('div'), document.createElement('span')]);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks keeps return values; make sure a previous test's shortcut stub does not leak.
    mockedIsKeyboardShortcut.mockReturnValue(false);
    mockedIsGrabKeyboardShortcut.mockReturnValue(false);
    jest.mocked(isEscapeKey).mockReturnValue(false);
    setActiveMode(null);
  });

  const openFlyout = async () => {
    mockedGetInspectedElementData.mockResolvedValue(mockComponentData);
    await userEvent.click(screen.getByTestId('inspectComponentButton'));
    fireEvent.click(document.body);
    await waitFor(() => expect(screen.getByTestId(INSPECT_FLYOUT_ID)).toBeInTheDocument());
  };

  it('should render correctly', () => {
    renderWithI18n(<InspectButton host={host} />);

    const inspectButton = screen.getByTestId('inspectComponentButton');

    expect(inspectButton).toBeInTheDocument();
  });

  it('should toggle inspect mode when clicked', async () => {
    renderWithI18n(<InspectButton host={host} />);

    const inspectButton = screen.getByTestId('inspectComponentButton');

    expect(inspectButton).toBeInTheDocument();

    await userEvent.click(inspectButton);

    const overlay = screen.queryByTestId('inspectOverlayContainer');

    expect(overlay).toBeInTheDocument();

    await userEvent.click(inspectButton);

    expect(overlay).not.toBeInTheDocument();
  });

  it('should handle keyboard shortcut to toggle inspect mode', async () => {
    renderWithI18n(<InspectButton host={host} />);

    mockedIsKeyboardShortcut.mockReturnValue(true);
    fireEvent.keyDown(window, { code: 'Quote', ctrlKey: true });

    expect(screen.getByTestId('inspectOverlayContainer')).toBeInTheDocument();

    mockedIsKeyboardShortcut.mockReturnValue(true);
    fireEvent.keyDown(window, { code: 'Quote', ctrlKey: true });

    expect(screen.queryByTestId('inspectOverlayContainer')).not.toBeInTheDocument();
  });

  it('should render grab button and toggle grab mode with its own keyboard shortcut', () => {
    renderWithI18n(<InspectButton host={host} mode="grab" />);

    expect(screen.getByTestId('grabComponentButton')).toBeInTheDocument();
    expect(screen.queryByTestId('inspectComponentButton')).not.toBeInTheDocument();

    mockedIsKeyboardShortcut.mockReturnValue(true);
    fireEvent.keyDown(window, { code: 'Quote', ctrlKey: true });

    expect(screen.queryByTestId('inspectOverlayContainer')).not.toBeInTheDocument();

    mockedIsGrabKeyboardShortcut.mockReturnValue(true);
    fireEvent.keyDown(window, { code: 'Quote', ctrlKey: true, shiftKey: true });

    expect(screen.getByTestId('inspectOverlayContainer')).toBeInTheDocument();
  });

  it('should keep inspect and grab modes mutually exclusive', async () => {
    renderWithI18n(
      <>
        <InspectButton host={host} />
        <InspectButton host={host} mode="grab" />
      </>
    );
    const inspectButton = screen.getByTestId('inspectComponentButton');
    const grabButton = screen.getByTestId('grabComponentButton');

    await userEvent.click(grabButton);

    expect(grabButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('inspectOverlayContainer')).toHaveLength(1);

    mockedIsKeyboardShortcut.mockReturnValue(true);
    mockedIsGrabKeyboardShortcut.mockReturnValue(false);
    fireEvent.keyDown(window, { code: 'Quote', ctrlKey: true });

    expect(inspectButton).toHaveAttribute('aria-pressed', 'true');
    expect(grabButton).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByTestId('inspectOverlayContainer')).toHaveLength(1);
  });

  it('should keep the mode that took over while an inspect click was still pending', async () => {
    let resolveComponentData: (data: null) => void = () => {};
    mockedGetInspectedElementData.mockReturnValue(
      new Promise((resolve) => {
        resolveComponentData = resolve;
      })
    );
    renderWithI18n(
      <>
        <InspectButton host={host} />
        <InspectButton host={host} mode="grab" />
      </>
    );
    const grabButton = screen.getByTestId('grabComponentButton');

    await userEvent.click(screen.getByTestId('inspectComponentButton'));
    fireEvent.click(document.body);
    mockedIsKeyboardShortcut.mockReturnValue(false);
    mockedIsGrabKeyboardShortcut.mockReturnValue(true);
    fireEvent.keyDown(window, { code: 'Quote', ctrlKey: true, shiftKey: true });

    expect(grabButton).toHaveAttribute('aria-pressed', 'true');

    await act(async () => resolveComponentData(null));

    expect(grabButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('inspectOverlayContainer')).toHaveLength(1);
  });

  it('should prevent target from losing focus on mouse down', async () => {
    renderWithI18n(<InspectButton host={host} />);

    const inspectButton = screen.getByTestId('inspectComponentButton');

    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
    const preventDefaultSpy = jest.spyOn(mouseDownEvent, 'preventDefault');

    fireEvent(inspectButton, mouseDownEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should disable inspect mode when the overlay closes itself', async () => {
    renderWithI18n(<InspectButton host={host} />);

    const inspectButton = screen.getByTestId('inspectComponentButton');

    await userEvent.click(inspectButton);

    const overlay = screen.queryByTestId('inspectOverlayContainer');

    expect(overlay).toBeInTheDocument();

    jest.mocked(isEscapeKey).mockReturnValue(true);
    fireEvent.keyDown(window, { key: 'Esc' });

    expect(overlay).not.toBeInTheDocument();
  });

  it('should open the flyout after clicking an element and close it via onClose', async () => {
    renderWithI18n(<InspectButton host={host} />);

    await openFlyout();

    expect(mockedGetInspectedElementData).toHaveBeenCalledWith(
      expect.objectContaining({ resolveFileData: host.resolveFileData })
    );
    expect(screen.queryByTestId('inspectOverlayContainer')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mockFlyoutClose'));

    expect(screen.queryByTestId(INSPECT_FLYOUT_ID)).not.toBeInTheDocument();
  });

  it('should close the flyout when inspect mode is toggled again', async () => {
    renderWithI18n(<InspectButton host={host} />);

    await openFlyout();

    await userEvent.click(screen.getByTestId('inspectComponentButton'));

    expect(screen.queryByTestId(INSPECT_FLYOUT_ID)).not.toBeInTheDocument();
    expect(screen.getByTestId('inspectOverlayContainer')).toBeInTheDocument();
  });

  it('should close the flyout when inspect mode is toggled again via the keyboard shortcut', async () => {
    renderWithI18n(<InspectButton host={host} />);

    await openFlyout();

    mockedIsKeyboardShortcut.mockReturnValue(true);
    fireEvent.keyDown(window, { code: 'Quote', ctrlKey: true });

    expect(screen.queryByTestId(INSPECT_FLYOUT_ID)).not.toBeInTheDocument();
    expect(screen.getByTestId('inspectOverlayContainer')).toBeInTheDocument();
  });

  it('should default the flyout color mode to the host EUI color mode', async () => {
    renderWithI18n(
      <EuiProvider colorMode="dark">
        <InspectButton host={host} />
      </EuiProvider>
    );

    await openFlyout();

    expect(screen.getByTestId(INSPECT_FLYOUT_ID)).toHaveAttribute('data-color-mode', 'dark');
  });

  it('should use the page color mode inside the toolbar dark theme', async () => {
    renderWithI18n(
      <EuiProvider colorMode="light">
        <HostColorModeContext.Provider value="light">
          <EuiThemeProvider colorMode="dark">
            <InspectButton host={host} />
          </EuiThemeProvider>
        </HostColorModeContext.Provider>
      </EuiProvider>
    );

    await openFlyout();

    expect(screen.getByTestId(INSPECT_FLYOUT_ID)).toHaveAttribute('data-color-mode', 'light');
  });

  it('should prefer the color mode from the host config', async () => {
    renderWithI18n(
      <EuiProvider colorMode="dark">
        <InspectButton host={createMockHost({ colorMode: 'light' })} />
      </EuiProvider>
    );

    await openFlyout();

    expect(screen.getByTestId(INSPECT_FLYOUT_ID)).toHaveAttribute('data-color-mode', 'light');
  });
});
