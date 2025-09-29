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
}));

const tabContentId = 'test-content-id';

describe('TabsBar', () => {
  it('renders tabs bar', async () => {
    const onAdd = jest.fn();
    const onSelect = jest.fn();
    const onSelectRecentlyClosed = jest.fn();
    const onClearRecentlyClosed = jest.fn();
    const onLabelEdited = jest.fn();
    const onClose = jest.fn();
    const onReorder = jest.fn();
    const getPreviewData = jest.fn();
    const onEBTEvent = jest.fn();

    const selectedItem = items[0];

    getPreviewData.mockReturnValue({
      query: {
        esql: 'SELECT * FROM table',
      },
      status: TabStatus.SUCCESS,
    });

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
});
