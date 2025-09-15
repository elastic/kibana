/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { InspectButton } from './inspect_button';
import { coreMock } from '@kbn/core/public/mocks';
import { isKeyboardShortcut } from '../../lib/keyboard_shortcut/keyboard_shortcut';
import { mockBranch } from '../../__mocks__/mocks';

jest.mock('../../lib/keyboard_shortcut/keyboard_shortcut', () => ({
  isKeyboardShortcut: jest.fn(),
  isMac: jest.fn(),
  isEscapeKey: jest.fn(),
}));

const mockedIsKeyboardShortcut = jest.mocked(isKeyboardShortcut);

describe('InspectButton', () => {
  const mockCoreStart = coreMock.createStart();

  beforeAll(() => {
    document.elementsFromPoint = jest
      .fn()
      .mockReturnValue([document.createElement('div'), document.createElement('span')]);
  });

  beforeEach(() => {
    jest.clearAllMocks();
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

    fireEvent.keyDown(window, { key: 'Esc' });

    expect(overlay).not.toBeInTheDocument();
  });
});
