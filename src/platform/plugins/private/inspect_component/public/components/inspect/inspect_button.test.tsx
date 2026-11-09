/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { InspectButton } from './inspect_button';
import { coreMock } from '@kbn/core/public/mocks';
import {
  isEscapeKey,
  isGrabKeyboardShortcut,
  isKeyboardShortcut,
} from '../../lib/keyboard_shortcut/keyboard_shortcut';
import { getInspectedElementData } from '../../lib/get_inspected_element_data';
import { activeMode$ } from '../../lib/active_mode';
import { mockBranch } from '../../__mocks__/mocks';

jest.mock('../../lib/keyboard_shortcut/keyboard_shortcut', () => ({
  isKeyboardShortcut: jest.fn(),
  isGrabKeyboardShortcut: jest.fn(),
  isMac: jest.fn(),
  isEscapeKey: jest.fn(),
}));

jest.mock('../../lib/get_inspected_element_data', () => ({
  getInspectedElementData: jest.fn(),
}));

const mockedIsKeyboardShortcut = jest.mocked(isKeyboardShortcut);
const mockedIsGrabKeyboardShortcut = jest.mocked(isGrabKeyboardShortcut);
const mockedGetInspectedElementData = jest.mocked(getInspectedElementData);

describe('InspectButton', () => {
  const mockCoreStart = coreMock.createStart();

  beforeAll(() => {
    document.elementsFromPoint = jest
      .fn()
      .mockReturnValue([document.createElement('div'), document.createElement('span')]);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    activeMode$.next(null);
  });

  it('should render correctly', () => {
    renderWithI18n(<InspectButton core={mockCoreStart} branch={mockBranch} />);

    const inspectButton = screen.getByTestId('inspectComponentButton');

    expect(inspectButton).toBeInTheDocument();
  });

  it('should toggle inspect mode when clicked', async () => {
    renderWithI18n(<InspectButton core={mockCoreStart} branch={mockBranch} />);

    const inspectButton = screen.getByTestId('inspectComponentButton');

    expect(inspectButton).toBeInTheDocument();

    await userEvent.click(inspectButton);

    const overlay = screen.queryByTestId('inspectOverlayContainer');

    expect(overlay).toBeInTheDocument();

    await userEvent.click(inspectButton);

    expect(overlay).not.toBeInTheDocument();
  });

  it('should handle keyboard shortcut to toggle inspect mode', async () => {
    renderWithI18n(<InspectButton core={mockCoreStart} branch={mockBranch} />);

    mockedIsKeyboardShortcut.mockReturnValue(true);
    fireEvent.keyDown(window, { code: 'Quote', ctrlKey: true });

    expect(screen.getByTestId('inspectOverlayContainer')).toBeInTheDocument();

    mockedIsKeyboardShortcut.mockReturnValue(true);
    fireEvent.keyDown(window, { code: 'Quote', ctrlKey: true });

    expect(screen.queryByTestId('inspectOverlayContainer')).not.toBeInTheDocument();
  });

  it('should render grab button and toggle grab mode with its own keyboard shortcut', async () => {
    renderWithI18n(<InspectButton core={mockCoreStart} branch={mockBranch} mode="grab" />);

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
        <InspectButton core={mockCoreStart} branch={mockBranch} />
        <InspectButton core={mockCoreStart} branch={mockBranch} mode="grab" />
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
        <InspectButton core={mockCoreStart} branch={mockBranch} />
        <InspectButton core={mockCoreStart} branch={mockBranch} mode="grab" />
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
    renderWithI18n(<InspectButton core={mockCoreStart} branch={mockBranch} />);

    const inspectButton = screen.getByTestId('inspectComponentButton');

    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
    const preventDefaultSpy = jest.spyOn(mouseDownEvent, 'preventDefault');

    fireEvent(inspectButton, mouseDownEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should close flyout overlay and disable inspect mode when overlay closes itself', async () => {
    renderWithI18n(<InspectButton core={mockCoreStart} branch={mockBranch} />);

    const inspectButton = screen.getByTestId('inspectComponentButton');

    await userEvent.click(inspectButton);

    expect(inspectButton).toBeInTheDocument();

    const overlay = screen.queryByTestId('inspectOverlayContainer');

    expect(overlay).toBeInTheDocument();

    jest.mocked(isEscapeKey).mockReturnValue(true);
    fireEvent.keyDown(window, { key: 'Esc' });

    expect(overlay).not.toBeInTheDocument();
  });
});
