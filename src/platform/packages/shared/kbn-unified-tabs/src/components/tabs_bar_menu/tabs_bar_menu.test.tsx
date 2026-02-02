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
import { TabsBarMenu } from './tabs_bar_menu';
import type { TabItem } from '../../types';
import { TabStatus, type RecentlyClosedTabItem } from '../../types';

const mockTabs = [
  { id: 'tab1', label: 'Tab 1' },
  { id: 'tab2', label: 'Tab 2' },
  { id: 'tab3', label: 'Tab 3' },
];

const mockRecentlyClosedTabs: RecentlyClosedTabItem[] = [
  { id: 'closed1', label: 'Closed Tab 1', closedAt: 0 },
  { id: 'closed2', label: 'Closed Tab 2', closedAt: 0 },
];

const tabsBarMenuButtonTestId = 'unifiedTabs_tabsBarMenuButton';

describe('TabsBarMenu', () => {
  const mockOnSelectOpenedTab = jest.fn();
  const mockOnSelectClosedTab = jest.fn();
  const mockOnClearRecentlyClosed = jest.fn();

  const defaultProps = {
    items: mockTabs,
    selectedItem: mockTabs[0],
    recentlyClosedItems: mockRecentlyClosedTabs,
    onSelect: mockOnSelectOpenedTab,
    onSelectRecentlyClosed: mockOnSelectClosedTab,
    onClearRecentlyClosed: mockOnClearRecentlyClosed,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the menu button', async () => {
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = await screen.findByTestId(tabsBarMenuButtonTestId);
    expect(menuButton).toBeInTheDocument();
  });

  it('opens popover when menu button is clicked', async () => {
    const user = userEvent.setup();
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = await screen.findByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    const tabsBarMenu = await screen.findByTestId('unifiedTabs_tabsBarMenu');
    expect(tabsBarMenu).toBeInTheDocument();
    expect(screen.getByText('Opened tabs')).toBeInTheDocument();
  });

  it('displays opened tabs correctly', async () => {
    const user = userEvent.setup();
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = await screen.findByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    expect(await screen.findByText('Opened tabs')).toBeInTheDocument();
    for (const tab of mockTabs) {
      expect(await screen.findByText(tab.label)).toBeInTheDocument();
    }
  });

  it('selects a tab when clicked', async () => {
    const user = userEvent.setup();
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = await screen.findByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    const secondTabOption = (await screen.findAllByRole('option'))[1];
    await user.click(secondTabOption);

    expect(mockOnSelectOpenedTab).toHaveBeenCalledWith(mockTabs[1]);
  });

  it('shows recently closed tabs when present', async () => {
    const user = userEvent.setup();
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = await screen.findByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    expect(await screen.findByText('Recently closed')).toBeInTheDocument();

    for (const tab of mockRecentlyClosedTabs) {
      expect(await screen.findByText(tab.label)).toBeInTheDocument();
    }
  });

  it('can clear recently closed items', async () => {
    const user = userEvent.setup();
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = await screen.findByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    expect(await screen.findByText('Recently closed')).toBeInTheDocument();
    await user.click(screen.getByTestId('unifiedTabs_tabsMenu_clearRecentlyClosed'));

    expect(defaultProps.onClearRecentlyClosed).toHaveBeenCalled();
  });

  it('selects a closed tab when clicked', async () => {
    const user = userEvent.setup();
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = await screen.findByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    const closedTabOption = await screen.findByTestId(
      `unifiedTabs_tabsMenu_recentlyClosedTab_${mockRecentlyClosedTabs[0].id}`
    );
    await user.click(closedTabOption);

    expect(mockOnSelectClosedTab).toHaveBeenCalledWith(mockRecentlyClosedTabs[0]);
  });

  it('does not show recently closed section when array is empty', async () => {
    const user = userEvent.setup();
    const propsWithNoClosedTabs = {
      ...defaultProps,
      recentlyClosedItems: [],
    };

    render(<TabsBarMenu {...propsWithNoClosedTabs} />);

    const menuButton = await screen.findByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    expect(screen.queryByText('Recently closed')).not.toBeInTheDocument();
  });

  it('marks the selected tab as checked', async () => {
    const user = userEvent.setup();
    render(
      <div style={{ width: '1000px' }}>
        <TabsBarMenu {...defaultProps} />
      </div>
    );

    const menuButton = await screen.findByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    const selectedTabOption = (await screen.findAllByText(mockTabs[0].label))[0];
    expect(selectedTabOption.closest('[aria-selected="true"]')).toBeInTheDocument();
  });

  it('displays relative time for recently closed tabs with timestamps', async () => {
    const user = userEvent.setup();
    const now = Date.now();
    const propsWithTimestamps = {
      ...defaultProps,
      recentlyClosedItems: [
        { id: 'closed1', label: 'Tab 1', closedAt: now - 5 * 60 * 1000 }, // 5 minutes
        { id: 'closed2', label: 'Tab 2', closedAt: now - 10 * 60 * 1000 }, // 10 minutes
      ],
    };

    render(<TabsBarMenu {...propsWithTimestamps} />);

    const menuButton = screen.getByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    expect(await screen.findByText('Recently closed')).toBeVisible();
    expect(await screen.findByText(/5 minutes ago/i)).toBeVisible();
    expect(await screen.findByText(/10 minutes ago/i)).toBeVisible();
  });

  it('shows preview when callback is provided', async () => {
    const user = userEvent.setup();
    const now = Date.now();
    const propsWithTimestamps = {
      ...defaultProps,
      getPreviewData: (item: TabItem) => ({
        title: `Preview of ${item.label}`,
        query: { language: 'esql', query: 'SELECT * FROM table' },
        status: TabStatus.DEFAULT,
      }),
      recentlyClosedItems: [
        { id: 'closed1', label: 'Closed Tab 1', closedAt: now - 5 * 60 * 1000 }, // 5 minutes
        { id: 'closed2', label: 'Closed Tab 2', closedAt: now - 10 * 60 * 1000 }, // 10 minutes
      ],
    };

    render(<TabsBarMenu {...propsWithTimestamps} />);

    const menuButton = screen.getByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    expect(await screen.findByText('Recently closed')).toBeVisible();

    // Hover over the closed tab item
    await user.hover(screen.getByText('Closed Tab 1'));

    // Wait for the preview to appear
    expect(await screen.findByText('Preview of Closed Tab 1')).toBeVisible();
  });
});
