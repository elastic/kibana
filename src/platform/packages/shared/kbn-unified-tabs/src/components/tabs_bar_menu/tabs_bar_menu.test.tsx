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
import { TabsBarMenu, testSubj } from './tabs_bar_menu';
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

describe('TabsBarMenu', () => {
  const mockOnSelectOpenedTab = jest.fn();
  const mockOnSelectClosedTab = jest.fn();
  const mockOnRestoreClosedGroup = jest.fn();
  const mockOnClearRecentlyClosed = jest.fn();

  const defaultProps = {
    items: mockTabs,
    selectedItem: mockTabs[0],
    recentlyClosedItems: mockRecentlyClosedGroup,
    hasReachedMaxItemsCount: false,
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

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    expect(menuButton).toBeInTheDocument();
  });

  it('opens popover when menu button is clicked', async () => {
    const user = userEvent.setup();
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    const tabsBarMenu = screen.getByTestId(testSubj.tabsBarMenu);
    expect(tabsBarMenu).toBeInTheDocument();
    expect(screen.getByText('Opened tabs')).toBeInTheDocument();
  });

  it('displays opened tabs correctly', async () => {
    const user = userEvent.setup();
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    expect(screen.getByText('Opened tabs')).toBeInTheDocument();
    for (const tab of mockTabs) {
      expect(screen.getByText(tab.label)).toBeInTheDocument();
    }
  });

  it('selects a tab when clicked', async () => {
    const user = userEvent.setup();
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    const secondTabOption = screen.getByTestId(testSubj.openedTab('tab2'));
    await user.click(secondTabOption);

    expect(mockOnSelectOpenedTab).toHaveBeenCalledWith(mockTabs[1]);
  });

  it('shows recently closed tab set when multiple were closed together', async () => {
    const user = userEvent.setup();
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    expect(screen.getByText('Recently closed')).toBeInTheDocument();

    // Root view shows a group entry instead of individual tabs
    expect(screen.getByText('2 tabs')).toBeInTheDocument();
  });

  it('shows individual recently closed tabs when they were not closed as a batch', async () => {
    const user = userEvent.setup();
    render(
      <TabsBarMenu
        {...defaultProps}
        recentlyClosedItems={[
          { id: 'closed1', label: 'Closed Tab 1', closedAt: now - 5 * 60 * 1000 },
          { id: 'closed2', label: 'Closed Tab 2', closedAt: now - 10 * 60 * 1000 },
        ]}
      />
    );

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    expect(screen.getByText('Recently closed')).toBeInTheDocument();
    expect(screen.getByText('Closed Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Closed Tab 2')).toBeInTheDocument();
  });

  it('can clear recently closed items', async () => {
    const user = userEvent.setup();
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    expect(screen.getByText('Recently closed')).toBeInTheDocument();
    await user.click(screen.getByTestId(testSubj.clearRecentlyClosed));

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

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    const closedTabOption = screen.getByTestId(
      testSubj.recentlyClosedTab(mockRecentlyClosedSingle[0].id)
    );
    await user.click(closedTabOption);

    expect(mockOnSelectClosedTab).toHaveBeenCalledWith(mockRecentlyClosedSingle[0]);
  });

  it('navigates into a closed tab set and can restore all tabs', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    // Enter the group
    await user.click(screen.getByText('2 tabs'));

    const restoreAllItem = await screen.findByTestId(testSubj.restoreAllTabs);
    await user.click(restoreAllItem);
    expect(mockOnRestoreClosedGroup).toHaveBeenCalledWith(mockRecentlyClosedGroup);
  });

  it('can restore a single tab from within a closed tab set', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<TabsBarMenu {...defaultProps} />);

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    await user.click(screen.getByText('2 tabs'));

    const groupTabItem = await screen.findByTestId(
      testSubj.recentlyClosedGroupTab(mockRecentlyClosedGroup[0].id)
    );
    await user.click(groupTabItem);

    expect(mockOnSelectClosedTab).toHaveBeenCalledWith(mockRecentlyClosedGroup[0]);
  });

  it('disables recently closed restore entries when the tab limit is reached', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <TabsBarMenu
        {...defaultProps}
        hasReachedMaxItemsCount={true}
        recentlyClosedItems={mockRecentlyClosedSingle}
      />
    );

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    const closedTabOption = screen.getByTestId(
      testSubj.recentlyClosedTab(mockRecentlyClosedSingle[0].id)
    );

    expect(closedTabOption).toBeDisabled();

    await user.hover(closedTabOption);

    expect(
      await screen.findByText(
        "You've reached the tab limit. Close a tab to restore recently closed tabs."
      )
    ).toBeVisible();

    await user.click(closedTabOption);

    expect(mockOnSelectClosedTab).not.toHaveBeenCalled();
  });

  it('still shows preview for disabled recently closed entries', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <TabsBarMenu
        {...defaultProps}
        hasReachedMaxItemsCount={true}
        getPreviewData={(item: TabItem) => ({
          title: `Preview of ${item.label}`,
          query: { language: 'esql', query: 'SELECT * FROM table' },
          status: TabStatus.DEFAULT,
        })}
        recentlyClosedItems={mockRecentlyClosedSingle}
      />
    );

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    const closedTabOption = screen.getByTestId(
      testSubj.recentlyClosedTab(mockRecentlyClosedSingle[0].id)
    );

    await user.hover(closedTabOption);

    const previewTitle = screen.getByTestId(
      `unifiedTabs_tabPreview_title_${mockRecentlyClosedSingle[0].id}`
    );

    expect(previewTitle).toBeVisible();
    expect(previewTitle).toHaveTextContent('Preview of Closed Tab 3');
  });

  it('keeps grouped recently closed entries navigable but disables restore actions at the tab limit', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<TabsBarMenu {...defaultProps} hasReachedMaxItemsCount={true} />);

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    const groupItem = screen.getByTestId(
      testSubj.recentlyClosedGroup(mockRecentlyClosedGroup[0].closedAt)
    );

    await user.click(groupItem);

    const restoreAllItem = await screen.findByTestId(testSubj.restoreAllTabs);
    expect(restoreAllItem).toBeDisabled();

    await user.hover(restoreAllItem);

    expect(
      await screen.findByText(
        "You've reached the tab limit. Close a tab to restore recently closed tabs."
      )
    ).toBeVisible();

    const groupTabItem = screen.getByTestId(
      testSubj.recentlyClosedGroupTab(mockRecentlyClosedGroup[0].id)
    );
    expect(groupTabItem).toBeDisabled();
  });

  it('still shows preview for disabled recently closed entries inside a group', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <TabsBarMenu
        {...defaultProps}
        hasReachedMaxItemsCount={true}
        getPreviewData={(item: TabItem) => ({
          title: `Preview of ${item.label}`,
          query: { language: 'esql', query: 'SELECT * FROM table' },
          status: TabStatus.DEFAULT,
        })}
      />
    );

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    const groupItem = screen.getByTestId(
      testSubj.recentlyClosedGroup(mockRecentlyClosedGroup[0].closedAt)
    );
    await user.click(groupItem);

    const groupTabItem = await screen.findByTestId(
      testSubj.recentlyClosedGroupTab(mockRecentlyClosedGroup[0].id)
    );
    expect(groupTabItem).toBeDisabled();

    await user.hover(groupTabItem);

    const previewTitle = screen.getByTestId(
      `unifiedTabs_tabPreview_title_${mockRecentlyClosedGroup[0].id}`
    );

    expect(previewTitle).toBeVisible();
    expect(previewTitle).toHaveTextContent('Preview of Closed Tab 1');
  });

  it('does not show recently closed section when array is empty', async () => {
    const user = userEvent.setup();
    const propsWithNoClosedTabs = {
      ...defaultProps,
      recentlyClosedItems: [],
    };

    render(<TabsBarMenu {...propsWithNoClosedTabs} />);

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    expect(screen.queryByText('Recently closed')).not.toBeInTheDocument();
  });

  it('marks the selected tab with aria-current', async () => {
    const user = userEvent.setup();
    render(
      <div style={{ width: '1000px' }}>
        <TabsBarMenu {...defaultProps} />
      </div>
    );

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    const selectedTabOption = screen.getByTestId(testSubj.openedTab('tab1'));
    const unselectedTabOption = screen.getByTestId(testSubj.openedTab('tab2'));

    expect(selectedTabOption).toHaveAttribute('aria-current', 'true');
    expect(unselectedTabOption).not.toHaveAttribute('aria-current');
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

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    expect(screen.getByText('Recently closed')).toBeVisible();
    expect(screen.getByText(/5 minutes ago/i)).toBeVisible();
    expect(screen.getByText(/10 minutes ago/i)).toBeVisible();
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

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    expect(screen.getByText('Recently closed')).toBeVisible();

    // Enter the group and hover over the closed tab item
    await user.click(screen.getByText('2 tabs'));

    const groupTabItem = await screen.findByTestId(
      testSubj.recentlyClosedGroupTab(mockRecentlyClosedGroup[0].id)
    );
    await user.hover(groupTabItem);

    // Wait for the preview to appear
    const title = screen.getByTestId(
      `unifiedTabs_tabPreview_title_${mockRecentlyClosedGroup[0].id}`
    );
    expect(title).toBeVisible();
    expect(title).toHaveTextContent('Preview of Closed Tab 1');
  });

  it('hides the preview after restoring and reopening the menu', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const propsWithPreview = {
      ...defaultProps,
      getPreviewData: (item: TabItem) => ({
        title: `Preview of ${item.label}`,
        query: { language: 'esql', query: 'SELECT * FROM table' },
        status: TabStatus.DEFAULT,
      }),
      recentlyClosedItems: mockRecentlyClosedGroup,
    };

    render(<TabsBarMenu {...propsWithPreview} />);

    const menuButton = screen.getByTestId(testSubj.tabsBarMenuButton);
    await user.click(menuButton);

    await user.click(screen.getByText('2 tabs'));
    const groupTabItem = await screen.findByTestId(
      testSubj.recentlyClosedGroupTab(mockRecentlyClosedGroup[0].id)
    );

    await user.hover(groupTabItem);
    const previewTitleTestId = `unifiedTabs_tabPreview_title_${mockRecentlyClosedGroup[0].id}`;
    expect(screen.getByTestId(previewTitleTestId)).toBeVisible();

    await user.click(groupTabItem);
    await user.click(menuButton);
    await user.click(
      screen.getByTestId(testSubj.recentlyClosedGroup(mockRecentlyClosedGroup[0].closedAt))
    );

    expect(screen.queryByTestId(previewTitleTestId)).not.toBeInTheDocument();
  });
});
