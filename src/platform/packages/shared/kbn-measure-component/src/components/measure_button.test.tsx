/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { MeasureButton } from './measure_button';
import { isMeasureShortcut } from '../lib/keyboard_shortcut';

jest.mock('../lib/keyboard_shortcut', () => ({
  isEscapeKey: jest.fn(),
  isMeasureShortcut: jest.fn(),
}));

const mockedIsMeasureShortcut = jest.mocked(isMeasureShortcut);

describe('MeasureButton', () => {
  beforeAll(() => {
    document.elementsFromPoint = jest.fn().mockReturnValue([document.createElement('div')]);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render the button', () => {
    renderWithI18n(<MeasureButton />);

    expect(screen.getByTestId('measureSpacingButton')).toBeInTheDocument();
  });

  it('should enable measure mode when clicked', async () => {
    renderWithI18n(<MeasureButton />);

    const button = screen.getByTestId('measureSpacingButton');
    await userEvent.click(button);

    expect(screen.getByTestId('measureOverlayContainer')).toBeInTheDocument();
  });

  it('should toggle measure mode on keyboard shortcut', () => {
    renderWithI18n(<MeasureButton />);

    mockedIsMeasureShortcut.mockReturnValue(true);
    fireEvent.keyDown(window, { code: 'Period', metaKey: true });

    expect(screen.getByTestId('measureOverlayContainer')).toBeInTheDocument();

    mockedIsMeasureShortcut.mockReturnValue(true);
    fireEvent.keyDown(window, { code: 'Period', metaKey: true });

    expect(screen.queryByTestId('measureOverlayContainer')).not.toBeInTheDocument();
  });

  it('should prevent target from losing focus on mouse down', () => {
    renderWithI18n(<MeasureButton />);

    const button = screen.getByTestId('measureSpacingButton');
    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
    const preventDefaultSpy = jest.spyOn(mouseDownEvent, 'preventDefault');

    fireEvent(button, mouseDownEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
