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
import { AppMenuPopoverActionButtons } from './app_menu_popover_action_buttons';

describe('AppMenuPopoverActionButtons', () => {
  const primaryActionItem = {
    id: 'save',
    label: 'Save',
    run: jest.fn(),
    iconType: 'save',
  };

  const secondaryActionItem = {
    id: 'cancel',
    label: 'Cancel',
    run: jest.fn(),
    iconType: 'cross',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when neither primary nor secondary action item is provided', () => {
    const { container } = render(<AppMenuPopoverActionButtons />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should render container when primary action item is provided', () => {
    render(<AppMenuPopoverActionButtons primaryActionItem={primaryActionItem} />);

    expect(screen.getByTestId('app-menu-popover-action-buttons-container')).toBeInTheDocument();
  });

  it('should render container when secondary action item is provided', () => {
    render(<AppMenuPopoverActionButtons secondaryActionItem={secondaryActionItem} />);

    expect(screen.getByTestId('app-menu-popover-action-buttons-container')).toBeInTheDocument();
  });

  it('should render primary action button', () => {
    render(<AppMenuPopoverActionButtons primaryActionItem={primaryActionItem} />);

    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should render secondary action button', () => {
    render(<AppMenuPopoverActionButtons secondaryActionItem={secondaryActionItem} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should render both primary and secondary action buttons', () => {
    render(
      <AppMenuPopoverActionButtons
        primaryActionItem={primaryActionItem}
        secondaryActionItem={secondaryActionItem}
      />
    );

    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should render secondary action before primary action in DOM order', () => {
    render(
      <AppMenuPopoverActionButtons
        primaryActionItem={primaryActionItem}
        secondaryActionItem={secondaryActionItem}
      />
    );

    const container = screen.getByTestId('app-menu-popover-action-buttons-container');
    const buttons = container.querySelectorAll('button');

    // Secondary should come first, then primary
    expect(buttons[0]).toHaveTextContent('Cancel');
    expect(buttons[1]).toHaveTextContent('Save');
  });
});
