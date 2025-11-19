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
import { TopNavMenuActionButton } from './top_nav_menu_action_button';

describe('TopNavMenuActionButton', () => {
  const defaultProps = {
    label: 'save',
    run: jest.fn(),
    closePopover: jest.fn(),
  };

  const splitButtonProps = {
    run: jest.fn(),
    secondaryButtonAriaLabel: 'More options',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders basic action button', () => {
    render(<TopNavMenuActionButton {...defaultProps} testId="test-action-button" />);
    expect(screen.getByTestId('test-action-button')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls run function when clicked', async () => {
    const user = userEvent.setup();
    render(<TopNavMenuActionButton {...defaultProps} testId="test-action-button" />);

    await user.click(screen.getByTestId('test-action-button'));

    expect(defaultProps.run).toHaveBeenCalledTimes(1);
    expect(defaultProps.run).toHaveBeenCalledWith(expect.any(HTMLElement));
  });

  it('renders as split button', () => {
    render(<TopNavMenuActionButton {...defaultProps} splitButtonProps={splitButtonProps} />);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByLabelText('More options')).toBeInTheDocument();
  });

  it('calls main run function when primary button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TopNavMenuActionButton
        {...defaultProps}
        splitButtonProps={splitButtonProps}
        testId="test-split-button"
      />
    );

    await user.click(screen.getByTestId('test-split-button'));

    expect(defaultProps.run).toHaveBeenCalledTimes(1);
    expect(splitButtonProps.run).not.toHaveBeenCalled();
  });

  it('calls split button run function when secondary button is clicked', async () => {
    const user = userEvent.setup();
    render(<TopNavMenuActionButton {...defaultProps} splitButtonProps={splitButtonProps} />);

    await user.click(screen.getByLabelText('More options'));

    expect(splitButtonProps.run).toHaveBeenCalledTimes(1);
    expect(defaultProps.run).not.toHaveBeenCalled();
  });

  it('does not attach onClick handler when href is present', () => {
    render(
      <TopNavMenuActionButton
        {...defaultProps}
        href="http://elastic.co"
        testId="test-action-button"
      />
    );

    const button = screen.getByTestId('test-action-button');

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', 'http://elastic.co');
  });
});
