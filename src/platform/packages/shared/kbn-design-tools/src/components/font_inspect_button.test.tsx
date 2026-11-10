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
import { FontInspectButton } from './font_inspect_button';
import { isFontInspectShortcut } from '../lib/keyboard_shortcuts';

jest.mock('../lib/keyboard_shortcuts', () => ({
  isEscapeKey: jest.fn(),
  isFontInspectShortcut: jest.fn(),
}));

const mockedIsFontInspectShortcut = jest.mocked(isFontInspectShortcut);

describe('FontInspectButton', () => {
  beforeAll(() => {
    document.elementsFromPoint = jest.fn().mockReturnValue([document.createElement('div')]);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the button', () => {
    renderWithI18n(<FontInspectButton />);

    expect(screen.getByTestId('fontInspectButton')).toBeInTheDocument();
  });

  it('should enable font inspect mode when clicked', async () => {
    renderWithI18n(<FontInspectButton />);

    const button = screen.getByTestId('fontInspectButton');
    await userEvent.click(button);

    expect(screen.getByTestId('fontInspectOverlayContainer')).toBeInTheDocument();
  });

  it('should toggle font inspect mode on keyboard shortcut', () => {
    renderWithI18n(<FontInspectButton />);

    mockedIsFontInspectShortcut.mockReturnValue(true);
    fireEvent.keyDown(window, { code: 'Comma', metaKey: true });

    expect(screen.getByTestId('fontInspectOverlayContainer')).toBeInTheDocument();

    mockedIsFontInspectShortcut.mockReturnValue(true);
    fireEvent.keyDown(window, { code: 'Comma', metaKey: true });

    expect(screen.queryByTestId('fontInspectOverlayContainer')).not.toBeInTheDocument();
  });

  it('should prevent target from losing focus on mouse down', () => {
    renderWithI18n(<FontInspectButton />);

    const button = screen.getByTestId('fontInspectButton');
    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
    const preventDefaultSpy = jest.spyOn(mouseDownEvent, 'preventDefault');

    fireEvent(button, mouseDownEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
