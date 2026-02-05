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
import { AppMenuOverflowButton } from './app_menu_overflow_button';

describe('AppMenuOverflowButton', () => {
  const defaultItems = [
    { id: 'item1', label: 'Item 1', run: jest.fn(), iconType: 'gear', order: 1 },
    { id: 'item2', label: 'Item 2', run: jest.fn(), iconType: 'search', order: 2 },
  ];

  const defaultProps = {
    items: defaultItems,
    isPopoverOpen: false,
    onPopoverToggle: jest.fn(),
    onPopoverClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the overflow button', () => {
    render(<AppMenuOverflowButton {...defaultProps} />);

    expect(screen.getByTestId('app-menu-overflow-button')).toBeInTheDocument();
  });

  it('should call onPopoverToggle when clicked', async () => {
    const user = userEvent.setup();
    render(<AppMenuOverflowButton {...defaultProps} />);

    await user.click(screen.getByTestId('app-menu-overflow-button'));

    expect(defaultProps.onPopoverToggle).toHaveBeenCalledTimes(1);
  });

  it('should return null when items array is empty', () => {
    const { container } = render(<AppMenuOverflowButton {...defaultProps} items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
