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
import { TabsBar } from './tabs_bar';
import { TabStatus } from '../../types';
import { servicesMock } from '../../../__mocks__/services';

const items = Array.from({ length: 5 }).map((_, i) => ({
  id: `tab-${i}`,
  label: `Tab ${i}`,
}));

const recentlyClosedItems = Array.from({ length: 3 }).map((_, i) => ({
  id: `closed-tab-${i}`,
  label: `Closed Tab ${i}`,
  closedAt: 0,
}));

const tabContentId = 'test-content-id';

const onAdd = jest.fn();
const onSelect = jest.fn();
const onSelectRecentlyClosed = jest.fn();
const onClearRecentlyClosed = jest.fn();
const onLabelEdited = jest.fn();
const onClose = jest.fn();
const onReorder = jest.fn();
const getPreviewData = jest.fn(() => ({
  query: {
    esql: 'SELECT * FROM table',
  },
  status: TabStatus.SUCCESS,
}));
const onEBTEvent = jest.fn();

describe('TabsBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tabs bar', async () => {
    const selectedItem = items[0];

    render(
      <TabsBar
        tabContentId={tabContentId}
        items={items}
        recentlyClosedItems={recentlyClosedItems}
        selectedItem={selectedItem}
        services={servicesMock}
        onAdd={onAdd}
        onLabelEdited={onLabelEdited}
        onSelect={onSelect}
        onSelectRecentlyClosed={onSelectRecentlyClosed}
        onClearRecentlyClosed={onClearRecentlyClosed}
        onClose={onClose}
        onReorder={onReorder}
        getPreviewData={getPreviewData}
        onEBTEvent={onEBTEvent}
      />
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(items.length);

    items.forEach((tabItem, index) => {
      const tab = tabs[index];
      const tabButton = screen.getByTestId(`unifiedTabs_selectTabBtn_${tabItem.id}`);
      expect(tabButton).toBeInTheDocument();
      expect(tabButton).toHaveTextContent(tabItem.label);
      expect(tab).toHaveAttribute('id', `tab-${tabItem.id}`);
      expect(tab).toHaveAttribute('aria-controls', tabContentId);
      expect(tab).toHaveAttribute(
        'aria-selected',
        tabItem.id === selectedItem.id ? 'true' : 'false'
      );
    });

    const tab = screen.getByTestId(`unifiedTabs_selectTabBtn_${items[1].id}`);
    tab.click();
    expect(onSelect).toHaveBeenCalled();

    const addButton = screen.getByTestId('unifiedTabs_tabsBar_newTabBtn');
    addButton.click();
    expect(onAdd).toHaveBeenCalled();

    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders customNewTabButton when provided', () => {
    const selectedItem = items[0];

    const customElementClickHandler = jest.fn();
    const customNewTabButton = (
      <button data-test-subj="custom-create-item-button" onClick={customElementClickHandler}>
        Custom Create Item
      </button>
    );

    render(
      <TabsBar
        tabContentId={tabContentId}
        items={items}
        recentlyClosedItems={recentlyClosedItems}
        selectedItem={selectedItem}
        services={servicesMock}
        onAdd={onAdd}
        onLabelEdited={onLabelEdited}
        onSelect={onSelect}
        onSelectRecentlyClosed={onSelectRecentlyClosed}
        onClearRecentlyClosed={onClearRecentlyClosed}
        onClose={onClose}
        onReorder={onReorder}
        getPreviewData={getPreviewData}
        onEBTEvent={onEBTEvent}
        customNewTabButton={customNewTabButton}
      />
    );

    // Verify custom element is rendered
    const customButton = screen.getByTestId('custom-create-item-button');
    expect(customButton).toBeInTheDocument();
    expect(customButton).toHaveTextContent('Custom Create Item');

    // Verify default add button is not rendered when customNewTabButton is provided
    const defaultAddButton = screen.queryByTestId('unifiedTabs_tabsBar_newTabBtn');
    expect(defaultAddButton).not.toBeInTheDocument();

    // Click custom element and assert handler is called
    customButton.click();
    expect(customElementClickHandler).toHaveBeenCalledTimes(1);

    // Verify onAdd is not called (only custom handler should be called)
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('does not render tabs bar menu when disableTabsBarMenu=true', () => {
    const selectedItem = items[0];

    render(
      <TabsBar
        tabContentId={tabContentId}
        items={items}
        recentlyClosedItems={recentlyClosedItems}
        selectedItem={selectedItem}
        services={servicesMock}
        onAdd={onAdd}
        onLabelEdited={onLabelEdited}
        onSelect={onSelect}
        onSelectRecentlyClosed={onSelectRecentlyClosed}
        onClearRecentlyClosed={onClearRecentlyClosed}
        onClose={onClose}
        onReorder={onReorder}
        getPreviewData={getPreviewData}
        onEBTEvent={onEBTEvent}
        disableTabsBarMenu={true}
      />
    );

    // Verify tabs are still rendered
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(items.length);

    // Verify tabs bar menu is not rendered
    const tabsBarMenu = screen.queryByTestId('unifiedTabs_tabsBarMenu');
    expect(tabsBarMenu).not.toBeInTheDocument();

    // Verify menu button is not rendered
    const menuButton = screen.queryByTestId('unifiedTabs_tabsBarMenuButton');
    expect(menuButton).not.toBeInTheDocument();
  });
});
