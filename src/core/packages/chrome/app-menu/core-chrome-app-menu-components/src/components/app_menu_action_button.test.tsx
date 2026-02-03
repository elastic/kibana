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
import { AppMenuActionButton } from './app_menu_action_button';

describe('AppMenuActionButton', () => {
  const defaultProps = {
    label: 'save',
    run: jest.fn(),
    iconType: 'save',
    id: 'saveButton',
    isPopoverOpen: false,
    onPopoverToggle: jest.fn(),
    onPopoverClose: jest.fn(),
  };

  const splitButtonProps = {
    run: jest.fn(),
    secondaryButtonAriaLabel: 'More options',
    secondaryButtonIcon: 'arrowDown',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render basic action button', () => {
    render(<AppMenuActionButton {...defaultProps} testId="test-action-button" />);
    expect(screen.getByTestId('test-action-button')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should call run function when clicked', async () => {
    const user = userEvent.setup();
    render(<AppMenuActionButton {...defaultProps} testId="test-action-button" />);

    await user.click(screen.getByTestId('test-action-button'));

    expect(defaultProps.run).toHaveBeenCalledTimes(1);
  });

  it('should render as split button', () => {
    render(<AppMenuActionButton {...defaultProps} splitButtonProps={splitButtonProps} />);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByLabelText('More options')).toBeInTheDocument();
  });

  it('should call main run function when primary button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AppMenuActionButton
        {...defaultProps}
        splitButtonProps={splitButtonProps}
        testId="test-split-button"
      />
    );

    await user.click(screen.getByTestId('test-split-button'));

    expect(defaultProps.run).toHaveBeenCalledTimes(1);
    expect(splitButtonProps.run).not.toHaveBeenCalled();
  });

  it('should call split button run function when secondary button is clicked', async () => {
    const user = userEvent.setup();
    render(<AppMenuActionButton {...defaultProps} splitButtonProps={splitButtonProps} />);

    await user.click(screen.getByLabelText('More options'));

    expect(splitButtonProps.run).toHaveBeenCalledTimes(1);
    expect(defaultProps.run).not.toHaveBeenCalled();
  });

  it('should not attach onClick handler when href is present', () => {
    render(
      <AppMenuActionButton {...defaultProps} href="http://elastic.co" testId="test-action-button" />
    );

    const button = screen.getByTestId('test-action-button');

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', 'http://elastic.co');
  });

  it('should render disabled button when disableButton is true', () => {
    render(
      <AppMenuActionButton {...defaultProps} disableButton={true} testId="test-action-button" />
    );

    expect(screen.getByTestId('test-action-button')).toBeDisabled();
  });

  it('should not call run when button is disabled', async () => {
    const user = userEvent.setup();
    render(
      <AppMenuActionButton {...defaultProps} disableButton={true} testId="test-action-button" />
    );

    await user.click(screen.getByTestId('test-action-button'));

    expect(defaultProps.run).not.toHaveBeenCalled();
  });

  it('should toggle popover when button with items is clicked', async () => {
    const user = userEvent.setup();
    const secondaryActionProps = {
      label: 'options',
      id: 'optionsButton',
      iconType: 'gear',
      isPopoverOpen: false,
      onPopoverToggle: jest.fn(),
      onPopoverClose: jest.fn(),
      items: [
        { id: 'item1', label: 'Item 1', run: jest.fn(), order: 1 },
        { id: 'item2', label: 'Item 2', run: jest.fn(), order: 2 },
      ],
    };

    render(<AppMenuActionButton {...secondaryActionProps} testId="test-action-button" />);

    await user.click(screen.getByTestId('test-action-button'));

    expect(secondaryActionProps.onPopoverToggle).toHaveBeenCalledTimes(1);
  });

  it('should toggle popover when split button with items is clicked', async () => {
    const user = userEvent.setup();
    const splitButtonPropsWithItems = {
      ...splitButtonProps,
      items: [
        { id: 'item1', label: 'Item 1', run: jest.fn(), order: 1 },
        { id: 'item2', label: 'Item 2', run: jest.fn(), order: 2 },
      ],
      run: undefined as never,
    };

    render(
      <AppMenuActionButton
        {...defaultProps}
        splitButtonProps={splitButtonPropsWithItems}
        testId="test-split-button"
      />
    );

    await user.click(screen.getByLabelText('More options'));

    expect(defaultProps.onPopoverToggle).toHaveBeenCalledTimes(1);
  });

  it('should not call secondary run when split button secondary is disabled', async () => {
    const user = userEvent.setup();
    const splitButtonPropsDisabled = {
      ...splitButtonProps,
      isSecondaryButtonDisabled: true,
    };

    render(
      <AppMenuActionButton
        {...defaultProps}
        splitButtonProps={splitButtonPropsDisabled}
        testId="test-split-button"
      />
    );

    await user.click(screen.getByLabelText('More options'));

    expect(splitButtonProps.run).not.toHaveBeenCalled();
  });
});
