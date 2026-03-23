/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { TabbedContentProps } from './tabbed_content';
import { TabbedContent } from './tabbed_content';
import { getPreviewDataMock } from '../../../__mocks__/get_preview_data';
import { servicesMock } from '../../../__mocks__/services';

const NEW_TAB = {
  id: 'new-tab',
  label: 'New tab',
};

describe('TabbedContent', () => {
  const TabsWrapper = ({
    initialItems,
    initialSelectedItemId,
    recentlyClosedItems = [],
    maxItemsCount,
    createItem,
    onChanged,
    onEBTEvent,
    disableRenderContent = false,
  }: {
    initialItems: TabbedContentProps['items'];
    initialSelectedItemId?: TabbedContentProps['selectedItemId'];
    recentlyClosedItems?: TabbedContentProps['recentlyClosedItems'];
    maxItemsCount?: TabbedContentProps['maxItemsCount'];
    createItem?: TabbedContentProps['createItem'];
    onChanged: TabbedContentProps['onChanged'];
    onEBTEvent: TabbedContentProps['onEBTEvent'];
    disableRenderContent?: boolean;
  }) => {
    const [{ managedItems, managedSelectedItemId }, setState] = useState<{
      managedItems: TabbedContentProps['items'];
      managedSelectedItemId: TabbedContentProps['selectedItemId'];
    }>(() => ({
      managedItems: initialItems,
      managedSelectedItemId: initialSelectedItemId,
    }));
    return (
      <TabbedContent
        items={managedItems}
        selectedItemId={managedSelectedItemId}
        recentlyClosedItems={recentlyClosedItems}
        maxItemsCount={maxItemsCount}
        createItem={createItem ?? (() => NEW_TAB)}
        getPreviewData={getPreviewDataMock}
        services={servicesMock}
        onChanged={(updatedState) => {
          onChanged(updatedState);
          setState({
            managedItems: updatedState.items,
            managedSelectedItemId: updatedState.selectedItem?.id,
          });
        }}
        onEBTEvent={onEBTEvent}
        onClearRecentlyClosed={jest.fn()}
        renderContent={
          !disableRenderContent
            ? (item) => <div style={{ paddingTop: '16px' }}>Content for tab: {item.label}</div>
            : undefined
        }
      />
    );
  };

  it('can restore all tabs from a recently closed tab set', async () => {
    const user = userEvent.setup({
      pointerEventsCheck: 0,
    });
    const initialItems = [{ id: 'tab1', label: 'Tab 1' }];
    const onChanged = jest.fn();
    const onEBTEvent = jest.fn();

    let counter = 0;
    const createItem = () => {
      counter += 1;
      return { id: `new-${counter}`, label: `New ${counter}` };
    };

    const closedAt = Date.now() - 60_000;
    const recentlyClosedItems = [
      { id: 'closed1', label: 'Closed Tab 1', closedAt },
      { id: 'closed2', label: 'Closed Tab 2', closedAt },
    ];

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={initialItems[0].id}
        recentlyClosedItems={recentlyClosedItems}
        createItem={createItem}
        onChanged={onChanged}
        onEBTEvent={onEBTEvent}
      />
    );

    await user.click(screen.getByTestId('unifiedTabs_tabsBarMenuButton'));
    await user.click(screen.getByText('2 tabs'));
    await user.click(await screen.findByTestId('unifiedTabs_tabsMenu_restoreAllTabs'));

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledWith({
        items: [
          initialItems[0],
          { id: 'new-1', label: 'Closed Tab 1', restoredFromId: 'closed1' },
          { id: 'new-2', label: 'Closed Tab 2', restoredFromId: 'closed2' },
        ],
        selectedItem: { id: 'new-1', label: 'Closed Tab 1', restoredFromId: 'closed1' },
      });
    });
  });

  it('does not restore a recently closed tab when the tab limit has been reached', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
    ];
    const onChanged = jest.fn();
    const onEBTEvent = jest.fn();
    const createItem = jest.fn(() => NEW_TAB);
    const recentlyClosedItems = [
      { id: 'closed1', label: 'Closed Tab 1', closedAt: Date.now() - 60_000 },
    ];

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={initialItems[0].id}
        recentlyClosedItems={recentlyClosedItems}
        maxItemsCount={initialItems.length}
        createItem={createItem}
        onChanged={onChanged}
        onEBTEvent={onEBTEvent}
      />
    );

    await user.click(screen.getByTestId('unifiedTabs_tabsBarMenuButton'));

    const closedTabOption = screen.getByTestId('unifiedTabs_tabsMenu_recentlyClosedTab_closed1');
    expect(closedTabOption).toBeDisabled();

    await user.click(closedTabOption);

    expect(createItem).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
    expect(onEBTEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventName: 'tabSelectRecentlyClosed' })
    );
  });

  it('can create a new tab and sends tabCreated EBT event', async () => {
    const user = userEvent.setup();
    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
    ];
    const onChanged = jest.fn();
    const onEBTEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={initialItems[0].id}
        onChanged={onChanged}
        onEBTEvent={onEBTEvent}
      />
    );

    await user.click(screen.getByTestId('unifiedTabs_tabsBar_newTabBtn'));
    expect(onChanged).toHaveBeenCalledWith({
      items: [...initialItems, NEW_TAB],
      selectedItem: NEW_TAB,
    });
    expect(onEBTEvent).toHaveBeenCalledWith({
      eventName: 'tabCreated',
      tabId: NEW_TAB.id,
      totalTabsOpen: initialItems.length,
    });

    await waitFor(() => {
      expect(screen.getByText('Content for tab: New tab')).toBeInTheDocument();
      const tab = screen.getByTestId(`unifiedTabs_selectTabBtn_${NEW_TAB.id}`);
      expect(tab.getAttribute('aria-selected')).toBe('true');
      expect(tab).toHaveFocus();
    });
  });

  it('can close a tab and sends tabClosed EBT event', async () => {
    const user = userEvent.setup();
    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
    ];
    const firstTab = initialItems[0];
    const secondTab = initialItems[1];

    const onChanged = jest.fn();
    const onEBTEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={firstTab.id}
        onChanged={onChanged}
        onEBTEvent={onEBTEvent}
      />
    );

    expect(screen.getByText(`Content for tab: ${firstTab.label}`)).toBeInTheDocument();
    expect(
      screen.getByTestId(`unifiedTabs_selectTabBtn_${firstTab.id}`).getAttribute('aria-selected')
    ).toBe('true');

    await user.click(screen.getByTestId(`unifiedTabs_closeTabBtn_${firstTab.id}`));
    expect(onChanged).toHaveBeenCalledWith({
      items: [secondTab],
      selectedItem: secondTab,
    });
    expect(onEBTEvent).toHaveBeenCalledWith({
      eventName: 'tabClosed',
      tabId: firstTab.id,
      totalTabsOpen: 2,
      remainingTabsCount: 1,
    });

    await waitFor(() => {
      expect(screen.getByText(`Content for tab: ${secondTab.label}`)).toBeInTheDocument();
      const tab = screen.getByTestId(`unifiedTabs_selectTabBtn_${secondTab.id}`);
      expect(tab.getAttribute('aria-selected')).toBe('true');
      expect(tab).toHaveFocus();
    });
  });

  it('can duplicate a tab and sends tabDuplicated event', async () => {
    const user = userEvent.setup();
    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
    ];
    const firstTab = initialItems[0];
    const secondTab = initialItems[1];
    const onChanged = jest.fn();
    const onEBTEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={firstTab.id}
        onChanged={onChanged}
        onEBTEvent={onEBTEvent}
      />
    );

    expect(screen.getByText(`Content for tab: ${firstTab.label}`)).toBeInTheDocument();
    expect(
      screen.getByTestId(`unifiedTabs_selectTabBtn_${firstTab.id}`).getAttribute('aria-selected')
    ).toBe('true');

    await user.click(screen.getByTestId(`unifiedTabs_tabMenuBtn_${firstTab.id}`));

    await waitFor(() => {
      expect(screen.getByTestId('unifiedTabs_tabMenuItem_duplicate')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('unifiedTabs_tabMenuItem_duplicate'));
    const duplicatedTab = {
      ...NEW_TAB,
      label: `${firstTab.label} (copy)`,
      duplicatedFromId: firstTab.id,
    };
    await waitFor(() => {
      expect(onEBTEvent).toHaveBeenCalledWith({
        eventName: 'tabDuplicated',
        tabId: firstTab.id,
        totalTabsOpen: 2,
      });
      expect(onChanged).toHaveBeenCalledWith({
        items: [firstTab, duplicatedTab, secondTab],
        selectedItem: duplicatedTab,
      });
      expect(screen.getByText(`Content for tab: ${duplicatedTab.label}`)).toBeInTheDocument();
      const tab = screen.getByTestId(`unifiedTabs_selectTabBtn_${duplicatedTab.id}`);
      expect(tab.getAttribute('aria-selected')).toBe('true');
      expect(tab).toHaveFocus();
    });
  });

  it('correctly numbers duplicate tabs when multiple copies exist', async () => {
    const user = userEvent.setup();

    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 1 (copy)' },
      { id: 'tab3', label: 'Tab 1 (copy) 2' },
      { id: 'tab4', label: 'Tab 2' },
    ];
    const firstTab = initialItems[0];
    const onChanged = jest.fn();
    const onEBTEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={firstTab.id}
        onChanged={onChanged}
        onEBTEvent={onEBTEvent}
      />
    );

    await user.click(screen.getByTestId(`unifiedTabs_tabMenuBtn_${firstTab.id}`));
    expect(screen.getByTestId('unifiedTabs_tabMenuItem_duplicate')).toBeInTheDocument();
    await user.click(screen.getByTestId('unifiedTabs_tabMenuItem_duplicate'));

    const duplicatedTab = { ...NEW_TAB, label: 'Tab 1 (copy) 3' };

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledWith({
        items: [firstTab, duplicatedTab, ...initialItems.slice(1)],
        selectedItem: duplicatedTab,
      });
    });

    expect(screen.getByText(`Content for tab: ${duplicatedTab.label}`)).toBeInTheDocument();
    const tab = screen.getByTestId(`unifiedTabs_selectTabBtn_${duplicatedTab.id}`);
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(tab).toHaveFocus();
  });

  it('correctly duplicates tabs with regex special characters in the label', async () => {
    const user = userEvent.setup();

    const tabWithSpecialChars = { id: 'tab1', label: 'Tab (1+2)*.?' };
    const initialItems = [tabWithSpecialChars, { id: 'tab2', label: 'Regular Tab' }];
    const onChanged = jest.fn();
    const onEBTEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={tabWithSpecialChars.id}
        onChanged={onChanged}
        onEBTEvent={onEBTEvent}
      />
    );

    await user.click(screen.getByTestId(`unifiedTabs_tabMenuBtn_${tabWithSpecialChars.id}`));

    const duplicateMenuItem = screen.getByTestId('unifiedTabs_tabMenuItem_duplicate');
    await waitFor(() => expect(duplicateMenuItem).toBeEnabled());
    await user.click(duplicateMenuItem);

    const duplicatedTab = { ...NEW_TAB, label: 'Tab (1+2)*.? (copy)' };

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledWith({
        items: [tabWithSpecialChars, duplicatedTab, initialItems[1]],
        selectedItem: duplicatedTab,
      });
      expect(screen.getByText(`Content for tab: ${duplicatedTab.label}`)).toBeInTheDocument();
      const tab = screen.getByTestId(`unifiedTabs_selectTabBtn_${duplicatedTab.id}`);
      expect(tab.getAttribute('aria-selected')).toBe('true');
      expect(tab).toHaveFocus();
    });
  });

  it('can switch to a different tab and sends tabSwitched event', async () => {
    const user = userEvent.setup();

    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
    ];
    const secondTab = initialItems[1];
    const onChanged = jest.fn();
    const onEBTEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={initialItems[0].id}
        onChanged={onChanged}
        onEBTEvent={onEBTEvent}
      />
    );

    await user.click(screen.getByTestId(`unifiedTabs_selectTabBtn_${secondTab.id}`));
    await waitFor(() => {
      expect(onEBTEvent).toHaveBeenCalledWith({
        eventName: 'tabSwitched',
        tabId: secondTab.id,
        fromIndex: 0,
        toIndex: 1,
        totalTabsOpen: 2,
      });
      const tab = screen.getByTestId(`unifiedTabs_selectTabBtn_${secondTab.id}`);
      expect(tab.getAttribute('aria-selected')).toBe('true');
      expect(tab).toHaveFocus();
    });
  });

  it('can close other tabs and sends tabClosedOthers event', async () => {
    const user = userEvent.setup();

    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
      { id: 'tab3', label: 'Tab 3' },
    ];
    const firstTab = initialItems[0];
    const onChanged = jest.fn();
    const onEBTEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={firstTab.id}
        onChanged={onChanged}
        onEBTEvent={onEBTEvent}
      />
    );

    expect(screen.getByText(`Content for tab: ${firstTab.label}`)).toBeInTheDocument();
    expect(
      screen.getByTestId(`unifiedTabs_selectTabBtn_${firstTab.id}`).getAttribute('aria-selected')
    ).toBe('true');

    await user.click(screen.getByTestId(`unifiedTabs_tabMenuBtn_${firstTab.id}`));
    await waitFor(() => {
      expect(screen.getByTestId('unifiedTabs_tabMenuItem_closeOtherTabs')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('unifiedTabs_tabMenuItem_closeOtherTabs'));

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledWith({
        items: [firstTab],
        selectedItem: firstTab,
      });
      expect(onEBTEvent).toHaveBeenCalledWith({
        eventName: 'tabClosedOthers',
        tabId: firstTab.id,
        totalTabsOpen: 3,
        closedTabsCount: 2,
      });
    });
  });

  it('can close tabs to the right and sends tabClosedToTheRight event', async () => {
    const user = userEvent.setup();

    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
      { id: 'tab3', label: 'Tab 3' },
      { id: 'tab4', label: 'Tab 4' },
    ];
    const firstTab = initialItems[0];
    const secondTab = initialItems[1];
    const onChanged = jest.fn();
    const onEBTEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={secondTab.id}
        onChanged={onChanged}
        onEBTEvent={onEBTEvent}
      />
    );

    await user.click(screen.getByTestId(`unifiedTabs_tabMenuBtn_${secondTab.id}`));
    await waitFor(() => {
      expect(screen.getByTestId('unifiedTabs_tabMenuItem_closeTabsToTheRight')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('unifiedTabs_tabMenuItem_closeTabsToTheRight'));

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledWith({
        items: [firstTab, secondTab],
        selectedItem: secondTab,
      });
      expect(onEBTEvent).toHaveBeenCalledWith({
        eventName: 'tabClosedToTheRight',
        tabId: secondTab.id,
        totalTabsOpen: 4,
        closedTabsCount: 2,
        remainingTabsCount: 2,
      });
    });
  });

  it('renders tab content when renderContent is provided', () => {
    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
    ];
    const onChanged = jest.fn();
    const onEBTEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={initialItems[0].id}
        onChanged={onChanged}
        onEBTEvent={onEBTEvent}
      />
    );

    // The tabs bar should be rendered
    expect(screen.queryByTestId('unifiedTabs_tabsBar')).toBeInTheDocument();
    // When renderContent is provided, the tab content area should be rendered
    expect(screen.getByTestId('unifiedTabs_selectedTabContent')).toBeInTheDocument();
    expect(screen.getByText('Content for tab: Tab 1')).toBeInTheDocument();
  });

  it('does not render tab content when renderContent is not provided', () => {
    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
    ];
    const onChanged = jest.fn();
    const onEBTEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={initialItems[0].id}
        onChanged={onChanged}
        onEBTEvent={onEBTEvent}
        disableRenderContent={true}
      />
    );

    // The tabs bar should still be rendered
    expect(screen.queryByTestId('unifiedTabs_tabsBar')).toBeInTheDocument();
    // When renderContent is not provided, the tab content area should NOT be rendered
    expect(screen.queryByTestId('unifiedTabs_selectedTabContent')).not.toBeInTheDocument();
  });
});
