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
import { ToolToggleButton } from './tool_toggle_button';

describe('ToolToggleButton', () => {
  const defaultProps = {
    isActive: false,
    onToggle: jest.fn(),
    handleKeydown: jest.fn(),
    iconType: 'text',
    inactiveTooltip: 'Inactive tooltip',
    ariaLabel: 'Test tool toggle',
    testSubj: 'toolToggleButton',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with the given test-subj and aria-label', () => {
    renderWithI18n(<ToolToggleButton {...defaultProps} />);

    const button = screen.getByTestId('toolToggleButton');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Test tool toggle');
  });

  it('should call onToggle when clicked', async () => {
    const onToggle = jest.fn();
    renderWithI18n(<ToolToggleButton {...defaultProps} onToggle={onToggle} />);

    await userEvent.click(screen.getByTestId('toolToggleButton'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should call preventDefault on mouse down', () => {
    renderWithI18n(<ToolToggleButton {...defaultProps} />);

    const button = screen.getByTestId('toolToggleButton');
    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
    const preventDefaultSpy = jest.spyOn(mouseDownEvent, 'preventDefault');

    fireEvent(button, mouseDownEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should invoke handleKeydown on window keydown', () => {
    const handleKeydown = jest.fn();
    renderWithI18n(<ToolToggleButton {...defaultProps} handleKeydown={handleKeydown} />);

    fireEvent.keyDown(window, { key: 'a' });

    expect(handleKeydown).toHaveBeenCalled();
  });
});
