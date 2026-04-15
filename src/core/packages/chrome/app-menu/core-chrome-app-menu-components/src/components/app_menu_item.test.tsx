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
import { AppMenuItem } from './app_menu_item';

describe('AppMenuItem', () => {
  const defaultProps = {
    label: 'elastic',
    id: 'elasticButton',
    iconType: 'logoElastic',
    order: 1,
    isPopoverOpen: false,
    onPopoverToggle: jest.fn(),
    onPopoverClose: jest.fn(),
  };

  const buttonProps = {
    ...defaultProps,
    run: jest.fn(),
    testId: 'test-button',
  };

  const itemWithPopoverProps = {
    ...defaultProps,
    items: [
      { id: 'item1', label: 'Item 1', run: jest.fn(), order: 1 },
      { id: 'item2', label: 'Item 2', run: jest.fn(), order: 2 },
    ],
    testId: 'test-item-with-popover',
  };

  const linkProps = {
    ...defaultProps,
    href: 'http://elastic.co',
    target: '_blank',
    testId: 'test-link',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render basic item', () => {
    render(<AppMenuItem {...buttonProps} />);
    expect(screen.getByTestId('test-button')).toBeInTheDocument();
    expect(screen.getByText('Elastic')).toBeInTheDocument();
  });

  it('should render as link when href is provided', () => {
    render(<AppMenuItem {...linkProps} />);
    const link = screen.getByTestId('test-link');
    expect(link).toHaveAttribute('href', 'http://elastic.co');
  });

  it('should call run function when clicked', async () => {
    const user = userEvent.setup();
    render(<AppMenuItem {...buttonProps} />);

    await user.click(screen.getByTestId('test-button'));

    expect(buttonProps.run).toHaveBeenCalledTimes(1);
  });

  it('should not call run when item is disabled', async () => {
    const user = userEvent.setup();
    render(<AppMenuItem {...buttonProps} disableButton={true} />);

    expect(screen.getByTestId('test-button')).toBeDisabled();

    await user.click(screen.getByTestId('test-button'));

    expect(buttonProps.run).not.toHaveBeenCalled();
  });

  it('should toggle popover when item with items is clicked', async () => {
    const user = userEvent.setup();

    render(<AppMenuItem {...itemWithPopoverProps} />);

    await user.click(screen.getByTestId('test-item-with-popover'));

    expect(defaultProps.onPopoverToggle).toHaveBeenCalledTimes(1);
  });

  it('should capitalize the label text', () => {
    render(<AppMenuItem {...buttonProps} label="settings" />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
