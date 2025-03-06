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
import { Tab } from './tab';

const tabItem = {
  id: 'test-id',
  label: 'test-label',
};

const tabContentId = 'test-content-id';

describe('Tab', () => {
  it('renders tab', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();

    render(
      <Tab
        tabContentId={tabContentId}
        item={tabItem}
        isSelected={false}
        onSelect={onSelect}
        onClose={onClose}
      />
    );

    expect(screen.getByText(tabItem.label)).toBeInTheDocument();

    const tab = screen.getByRole('tab');
    expect(tab).toHaveAttribute('id', `tab-${tabItem.id}`);
    expect(tab).toHaveAttribute('aria-controls', tabContentId);
    tab.click();
    expect(onSelect).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    const closeButton = screen.getByTestId(`unifiedTabs_closeTabBtn_${tabItem.id}`);
    closeButton.click();
    expect(onClose).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
