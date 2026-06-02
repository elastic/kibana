/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiDragDropContext } from '@elastic/eui';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { HiddenItemsSection } from './hidden_items_section';
import type { NavigationItemInfo } from '../types';

describe('HiddenItemsSection', () => {
  const toggleItemVisibility = jest.fn();

  const hiddenItems: NavigationItemInfo[] = [
    { id: 'item1', title: 'Item 1', hidden: true },
    { id: 'item2', title: 'Item 2', hidden: true },
  ];

  const renderSection = (items: NavigationItemInfo[]) =>
    renderWithI18n(
      <EuiDragDropContext onDragEnd={jest.fn()}>
        <HiddenItemsSection items={items} toggleItemVisibility={toggleItemVisibility} />
      </EuiDragDropContext>
    );

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the section heading', () => {
    renderSection(hiddenItems);
    expect(screen.getByText('Hide under More')).toBeInTheDocument();
  });

  it('should render all hidden items', () => {
    renderSection(hiddenItems);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('should render the section with an empty drop zone when there are no hidden items', () => {
    renderSection([]);
    expect(screen.getByText('Hide under More')).toBeInTheDocument();
    expect(screen.getByTestId('customizeNavigationEmptyDropPlaceholder')).toBeInTheDocument();
  });
});
