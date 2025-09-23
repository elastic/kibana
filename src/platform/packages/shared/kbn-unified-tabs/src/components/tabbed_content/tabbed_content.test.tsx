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
import { TabbedContent, type TabbedContentProps } from './tabbed_content';
import { getPreviewDataMock } from '../../../__mocks__/get_preview_data';
import { servicesMock } from '../../../__mocks__/services';

const NEW_TAB = {
  id: 'new-tab',
  label: 'New tab',
};

describe('TabbedContent', () => {
  const user = userEvent.setup();

  const TabsWrapper = ({
    initialItems,
    initialSelectedItemId,
    onChanged,
    onEvent,
  }: {
    initialItems: TabbedContentProps['items'];
    initialSelectedItemId?: TabbedContentProps['selectedItemId'];
    onChanged: TabbedContentProps['onChanged'];
    onEvent: TabbedContentProps['onEvent'];
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
        recentlyClosedItems={[]}
        createItem={() => NEW_TAB}
        getPreviewData={getPreviewDataMock}
        services={servicesMock}
        onChanged={(updatedState) => {
          onChanged(updatedState);
          setState({
            managedItems: updatedState.items,
            managedSelectedItemId: updatedState.selectedItem?.id,
          });
        }}
        onEvent={onEvent}
        renderContent={(item) => (
          <div style={{ paddingTop: '16px' }}>Content for tab: {item.label}</div>
        )}
      />
    );
  };

  it('can create a new tab and sends tabCreated EBT event', async () => {
    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
    ];
    const onChanged = jest.fn();
    const onEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={initialItems[0].id}
        onChanged={onChanged}
        onEvent={onEvent}
      />
    );
    screen.getByTestId('unifiedTabs_tabsBar_newTabBtn').click();
    expect(onChanged).toHaveBeenCalledWith({
      items: [...initialItems, NEW_TAB],
      selectedItem: NEW_TAB,
    });
    expect(onEvent).toHaveBeenCalledWith('tabCreated', {
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
    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
    ];
    const firstTab = initialItems[0];
    const secondTab = initialItems[1];

    const onChanged = jest.fn();
    const onEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={firstTab.id}
        onChanged={onChanged}
        onEvent={onEvent}
      />
    );

    expect(screen.getByText(`Content for tab: ${firstTab.label}`)).toBeInTheDocument();
    expect(
      screen.getByTestId(`unifiedTabs_selectTabBtn_${firstTab.id}`).getAttribute('aria-selected')
    ).toBe('true');

    screen.getByTestId(`unifiedTabs_closeTabBtn_${firstTab.id}`).click();
    expect(onChanged).toHaveBeenCalledWith({
      items: [secondTab],
      selectedItem: secondTab,
    });
    expect(onEvent).toHaveBeenCalledWith('tabClosed', {
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
    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 2' },
    ];
    const firstTab = initialItems[0];
    const secondTab = initialItems[1];
    const onChanged = jest.fn();
    const onEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={firstTab.id}
        onChanged={onChanged}
        onEvent={onEvent}
      />
    );

    expect(screen.getByText(`Content for tab: ${firstTab.label}`)).toBeInTheDocument();
    expect(
      screen.getByTestId(`unifiedTabs_selectTabBtn_${firstTab.id}`).getAttribute('aria-selected')
    ).toBe('true');

    screen.getByTestId(`unifiedTabs_tabMenuBtn_${firstTab.id}`).click();

    await waitFor(() => {
      expect(screen.getByTestId('unifiedTabs_tabMenuItem_duplicate')).toBeInTheDocument();
    });

    screen.getByTestId('unifiedTabs_tabMenuItem_duplicate').click();
    const duplicatedTab = {
      ...NEW_TAB,
      label: `${firstTab.label} (copy)`,
      duplicatedFromId: firstTab.id,
    };
    await waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith('tabDuplicated', {
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
    const initialItems = [
      { id: 'tab1', label: 'Tab 1' },
      { id: 'tab2', label: 'Tab 1 (copy)' },
      { id: 'tab3', label: 'Tab 1 (copy) 2' },
      { id: 'tab4', label: 'Tab 2' },
    ];
    const firstTab = initialItems[0];
    const onChanged = jest.fn();
    const onEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={firstTab.id}
        onChanged={onChanged}
        onEvent={onEvent}
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
    const tabWithSpecialChars = { id: 'tab1', label: 'Tab (1+2)*.?' };
    const initialItems = [tabWithSpecialChars, { id: 'tab2', label: 'Regular Tab' }];
    const onChanged = jest.fn();
    const onEvent = jest.fn();

    render(
      <TabsWrapper
        initialItems={initialItems}
        initialSelectedItemId={tabWithSpecialChars.id}
        onChanged={onChanged}
        onEvent={onEvent}
      />
    );

    await user.click(screen.getByTestId(`unifiedTabs_tabMenuBtn_${tabWithSpecialChars.id}`));
    expect(screen.getByTestId('unifiedTabs_tabMenuItem_duplicate')).toBeInTheDocument();
    await user.click(screen.getByTestId('unifiedTabs_tabMenuItem_duplicate'));

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
});
