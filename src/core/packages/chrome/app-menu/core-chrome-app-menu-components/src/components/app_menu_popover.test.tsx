/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AppMenuPopover } from './app_menu_popover';

describe('AppMenuPopover', () => {
  const defaultItems = [
    { id: 'item1', label: 'Item 1', run: jest.fn(), order: 1 },
    { id: 'item2', label: 'Item 2', run: jest.fn(), order: 2 },
  ];

  const defaultAnchorElement = <button data-test-subj="anchor-button">Anchor</button>;

  const defaultProps = {
    items: defaultItems,
    anchorElement: defaultAnchorElement,
    isOpen: false,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the popover with anchor element', () => {
    render(<AppMenuPopover {...defaultProps} />);

    expect(screen.getByTestId('anchor-button')).toBeInTheDocument();
  });

  it('should render anchor element even with empty items', () => {
    render(<AppMenuPopover {...defaultProps} items={[]} />);

    expect(screen.getByTestId('anchor-button')).toBeInTheDocument();
  });

  it('should render menu items when popover is open', async () => {
    render(<AppMenuPopover {...defaultProps} isOpen={true} />);

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  it('should not render menu items when popover is closed', () => {
    render(<AppMenuPopover {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
  });

  it('should re-evaluate function-valued disableButton when the popover opens', async () => {
    let isItemDisabled = true;
    const items = [
      {
        id: 'dynamic',
        label: 'Dynamic item',
        run: jest.fn(),
        order: 1,
        testId: 'dynamic-item',
        disableButton: () => isItemDisabled,
      },
    ];
    // `items` and `onClose` keep the same identity across both renders
    const props = { ...defaultProps, items };

    const { rerender } = render(<AppMenuPopover {...props} isOpen={false} />);

    isItemDisabled = false;
    rerender(<AppMenuPopover {...props} isOpen={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-item')).toBeEnabled();
    });
  });

  it('should not rebuild panels on re-renders that do not change its props', async () => {
    const disableButton = jest.fn(() => false);
    const items = [{ id: 'counted', label: 'Counted', run: jest.fn(), order: 1, disableButton }];
    const props = { ...defaultProps, items };

    const { rerender } = render(<AppMenuPopover {...props} isOpen={true} />);
    await waitFor(() => expect(screen.getByText('Counted')).toBeInTheDocument());
    const callsAfterOpen = disableButton.mock.calls.length;

    rerender(<AppMenuPopover {...props} isOpen={true} />);
    rerender(<AppMenuPopover {...props} isOpen={true} />);

    expect(disableButton).toHaveBeenCalledTimes(callsAfterOpen);
  });

  it('should keep rendering the items during the exit transition when the popover closes', async () => {
    const { rerender } = render(<AppMenuPopover {...defaultProps} isOpen={true} />);
    await waitFor(() => expect(screen.getByText('Item 1')).toBeInTheDocument());

    rerender(<AppMenuPopover {...defaultProps} isOpen={false} />);

    // EuiPopover keeps its content mounted while closing, and tests rely on it (e.g. Discover's
    // top nav accessibility test looks up the clicked menu item right after the popover closes)
    expect(screen.getByTestId('anchor-button')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Item 1')).not.toBeInTheDocument());
  });

  it('should wrap anchor in tooltip when tooltipContent is provided', () => {
    render(<AppMenuPopover {...defaultProps} tooltipContent="Tooltip content" />);

    const anchorButton = screen.getByTestId('anchor-button');
    expect(anchorButton.closest('.euiToolTipAnchor')).toBeInTheDocument();
  });

  it('should wrap anchor in tooltip when tooltipTitle is provided', () => {
    render(<AppMenuPopover {...defaultProps} tooltipTitle="Tooltip title" />);

    const anchorButton = screen.getByTestId('anchor-button');
    expect(anchorButton.closest('.euiToolTipAnchor')).toBeInTheDocument();
  });

  it('should wrap anchor in tooltip when both tooltipContent and tooltipTitle are provided', () => {
    render(
      <AppMenuPopover
        {...defaultProps}
        tooltipContent="Tooltip content"
        tooltipTitle="Tooltip title"
      />
    );

    const anchorButton = screen.getByTestId('anchor-button');
    expect(anchorButton.closest('.euiToolTipAnchor')).toBeInTheDocument();
  });

  it('should not wrap anchor in tooltip when neither tooltipContent nor tooltipTitle is provided', () => {
    render(<AppMenuPopover {...defaultProps} />);

    const anchorButton = screen.getByTestId('anchor-button');
    expect(anchorButton.closest('.euiToolTipAnchor')).not.toBeInTheDocument();
  });

  it('should apply popoverWidth to the context menu', async () => {
    const { baseElement } = render(
      <AppMenuPopover {...defaultProps} isOpen={true} popoverWidth={300} />
    );

    await waitFor(() => {
      const contextMenu = baseElement.querySelector('.euiContextMenu');
      expect(contextMenu).toHaveStyle({ width: '300px' });
    });
  });
});
