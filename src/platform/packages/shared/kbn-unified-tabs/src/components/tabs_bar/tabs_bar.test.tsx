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

const items = Array.from({ length: 5 }).map((_, i) => ({
  id: `tab-${i}`,
  label: `Tab ${i}`,
}));

const tabContentId = 'test-content-id';

describe('TabsBar', () => {
  it('renders tabs bar', async () => {
    const onAdd = jest.fn();
    const onSelect = jest.fn();
    const onClose = jest.fn();

    const selectedItem = items[0];

    render(
      <TabsBar
        tabContentId={tabContentId}
        items={items}
        selectedItem={selectedItem}
        onAdd={onAdd}
        onSelect={onSelect}
        onClose={onClose}
      />
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(items.length);

    items.forEach((tabItem, index) => {
      const tab = tabs[index];
      expect(screen.getByText(tabItem.label)).toBeInTheDocument();
      expect(tab).toHaveAttribute('id', `tab-${tabItem.id}`);
      expect(tab).toHaveAttribute('aria-controls', tabContentId);
      expect(tab).toHaveAttribute(
        'aria-selected',
        tabItem.id === selectedItem.id ? 'true' : 'false'
      );
    });

    const tab = screen.getByText(items[1].label);
    tab.click();
    expect(onSelect).toHaveBeenCalled();

    const addButton = screen.getByTestId('unifiedTabs_tabsBar_newTabBtn');
    addButton.click();
    expect(onAdd).toHaveBeenCalled();

    expect(onClose).not.toHaveBeenCalled();
  });
});
