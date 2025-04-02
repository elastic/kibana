/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabsBarMenu } from './tabs_bar_menu';

const mockTabs = [
  { id: 'tab1', label: 'Tab 1' },
  { id: 'tab2', label: 'Tab 2' },
  { id: 'tab3', label: 'Tab 3' },
];

const mockRecentlyClosedTabs = [
  { id: 'closed1', label: 'Closed Tab 1' },
  { id: 'closed2', label: 'Closed Tab 2' },
];

const tabsBarMenuButtonTestId = 'unifiedTabs_tabsBarMenuButton';

describe('TabsBarMenu', () => {
  const mockOnSelectOpenedTab = jest.fn();

  const defaultProps = {
    openedItems: mockTabs,
    selectedItem: mockTabs[0],
    onSelectOpenedTab: mockOnSelectOpenedTab,
    recentlyClosedItems: mockRecentlyClosedTabs,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the menu button', () => {
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = screen.getByTestId(tabsBarMenuButtonTestId);
    expect(menuButton).toBeInTheDocument();
  });

  it('opens popover when menu button is clicked', () => {
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = screen.getByTestId(tabsBarMenuButtonTestId);

    fireEvent.click(menuButton);

    const tabsBarMenu = screen.getByTestId('unifiedTabs_tabsBarMenu');
    expect(tabsBarMenu).toBeInTheDocument();
    expect(screen.getByText('Opened tabs')).toBeInTheDocument();
  });

  it('displays opened tabs correctly', () => {
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = screen.getByTestId(tabsBarMenuButtonTestId);

    fireEvent.click(menuButton);

    mockTabs.forEach((tab) => {
      expect(screen.getByText(tab.label)).toBeInTheDocument();
    });
  });

  it('selects a tab when clicked', () => {
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = screen.getByTestId(tabsBarMenuButtonTestId);

    fireEvent.click(menuButton);

    const secondTabOption = screen.getByText(mockTabs[1].label);
    fireEvent.click(secondTabOption);

    expect(mockOnSelectOpenedTab).toHaveBeenCalledWith(mockTabs[1]);
  });

  it('shows recently closed tabs when present', () => {
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = screen.getByTestId(tabsBarMenuButtonTestId);

    fireEvent.click(menuButton);

    expect(screen.getByText('Recently closed')).toBeInTheDocument();

    mockRecentlyClosedTabs.forEach((tab) => {
      expect(screen.getByText(tab.label)).toBeInTheDocument();
    });
  });

  it('does not show recently closed section when array is empty', () => {
    const propsWithNoClosedTabs = {
      ...defaultProps,
      recentlyClosedItems: [],
    };

    render(<TabsBarMenu {...propsWithNoClosedTabs} />);

    const menuButton = screen.getByTestId(tabsBarMenuButtonTestId);

    fireEvent.click(menuButton);

    expect(screen.queryByText('Recently closed')).not.toBeInTheDocument();
  });

  it('marks the selected tab as checked', () => {
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = screen.getByTestId(tabsBarMenuButtonTestId);

    fireEvent.click(menuButton);

    const selectedTabOption = screen.getByText(mockTabs[0].label);

    expect(selectedTabOption.closest('[aria-selected="true"]')).toBeInTheDocument();
  });
});
