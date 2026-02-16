/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabsBarMenu } from './tabs_bar_menu';
import type { TabItem } from '../../types';
import { TabStatus, type RecentlyClosedTabItem } from '../../types';

const mockTabs = [
  { id: 'tab1', label: 'Tab 1' },
  { id: 'tab2', label: 'Tab 2' },
  { id: 'tab3', label: 'Tab 3' },
];

const now = Date.now();

const mockRecentlyClosedGroup: RecentlyClosedTabItem[] = [
  { id: 'closed1', label: 'Closed Tab 1', closedAt: now - 5 * 60 * 1000 }, // 5 minutes
  { id: 'closed2', label: 'Closed Tab 2', closedAt: now - 5 * 60 * 1000 }, // same batch
];

const mockRecentlyClosedSingle: RecentlyClosedTabItem[] = [
  { id: 'closed3', label: 'Closed Tab 3', closedAt: now - 10 * 60 * 1000 }, // 10 minutes
];

const tabsBarMenuButtonTestId = 'unifiedTabs_tabsBarMenuButton';

describe('TabsBarMenu', () => {
  const mockOnSelectOpenedTab = jest.fn();
  const mockOnSelectClosedTab = jest.fn();
  const mockOnRestoreClosedGroup = jest.fn();
  const mockOnClearRecentlyClosed = jest.fn();

  const defaultProps = {
    items: mockTabs,
    selectedItem: mockTabs[0],
    recentlyClosedItems: mockRecentlyClosedGroup,
    onSelect: mockOnSelectOpenedTab,
    onSelectRecentlyClosed: mockOnSelectClosedTab,
    onRestoreRecentlyClosedGroup: mockOnRestoreClosedGroup,
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

  it('shows recently closed tab set when multiple were closed together', async () => {
    const user = userEvent.setup();
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = await screen.findByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    expect(await screen.findByText('Recently closed')).toBeInTheDocument();

    // Root view shows a group entry instead of individual tabs
    expect(await screen.findByText('2 tabs')).toBeInTheDocument();
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

  it('selects a closed tab when a single recently-closed item is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TabsBarMenu
        {...defaultProps}
        recentlyClosedItems={mockRecentlyClosedSingle}
        onSelectRecentlyClosed={mockOnSelectClosedTab}
      />
    );

    const menuButton = await screen.findByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    const closedTabOption = await screen.findByTestId(
      `unifiedTabs_tabsMenu_recentlyClosedTab_${mockRecentlyClosedSingle[0].id}`
    );
    await user.click(closedTabOption);

    expect(mockOnSelectClosedTab).toHaveBeenCalledWith(mockRecentlyClosedSingle[0]);
  });

  it('navigates into a closed tab set and can restore all tabs', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = await screen.findByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    // Enter the group
    await user.click(screen.getByText('2 tabs'));

    const restoreAllItem = await screen.findByTestId('unifiedTabs_tabsMenu_restoreAllTabs');
    await user.click(restoreAllItem);
    expect(mockOnRestoreClosedGroup).toHaveBeenCalledWith(mockRecentlyClosedGroup);
  });

  it('can restore a single tab from within a closed tab set', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = await screen.findByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    await user.click(screen.getByText('2 tabs'));

    await screen.findByTestId('unifiedTabs_tabsMenu_restoreAllTabs');

    const groupTabItem = await screen.findByTestId(
      `unifiedTabs_tabsMenu_recentlyClosedGroupTab_${mockRecentlyClosedGroup[0].id}`
    );
    await user.click(groupTabItem);

    expect(mockOnSelectClosedTab).toHaveBeenCalledWith(mockRecentlyClosedGroup[0]);
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

  it('displays relative time for recently closed items', async () => {
    const user = userEvent.setup();
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

  it('shows preview when callback is provided (inside a tab set)', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const propsWithTimestamps = {
      ...defaultProps,
      getPreviewData: (item: TabItem) => ({
        title: `Preview of ${item.label}`,
        query: { language: 'esql', query: 'SELECT * FROM table' },
        status: TabStatus.DEFAULT,
      }),
      recentlyClosedItems: mockRecentlyClosedGroup,
    };

    render(<TabsBarMenu {...propsWithTimestamps} />);

    const menuButton = screen.getByTestId(tabsBarMenuButtonTestId);
    await user.click(menuButton);

    expect(await screen.findByText('Recently closed')).toBeVisible();

    // Enter the group and hover over the closed tab item
    await user.click(screen.getByText('2 tabs'));

    await screen.findByTestId('unifiedTabs_tabsMenu_restoreAllTabs');
    const groupTabItem = await screen.findByTestId(
      `unifiedTabs_tabsMenu_recentlyClosedGroupTab_${mockRecentlyClosedGroup[0].id}`
    );
    const groupTabText = within(groupTabItem).getByTestId('fullText');
    await user.hover(groupTabText);

    // Wait for the preview to appear
    const title = await screen.findByTestId(
      `unifiedTabs_tabPreview_title_${mockRecentlyClosedGroup[0].id}`
    );
    expect(title).toBeVisible();
    expect(title).toHaveTextContent('Preview of Closed Tab 1');
  });
});
