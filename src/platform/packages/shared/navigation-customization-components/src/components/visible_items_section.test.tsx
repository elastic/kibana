/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { VisibleItemsSection } from './visible_items_section';
import type { NavigationItemInfo } from '../types';

describe('VisibleItemsSection', () => {
  const onDragEnd = jest.fn();
  const toggleItemVisibility = jest.fn();

  const visibleItems: NavigationItemInfo[] = [
    { id: 'item1', title: 'Item 1', hidden: false },
    { id: 'item2', title: 'Item 2', hidden: false },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should always render the section header', () => {
    renderWithI18n(
      <VisibleItemsSection
        items={visibleItems}
        onDragEnd={onDragEnd}
        toggleItemVisibility={toggleItemVisibility}
      />
    );
    expect(screen.getByText('Order and visibility')).toBeInTheDocument();
  });

  it('should render the section description', () => {
    renderWithI18n(
      <VisibleItemsSection
        items={visibleItems}
        onDragEnd={onDragEnd}
        toggleItemVisibility={toggleItemVisibility}
      />
    );
    expect(
      screen.getByText('Reorder or hide apps in this space without affecting other users.')
    ).toBeInTheDocument();
  });

  it('should render all visible items', () => {
    renderWithI18n(
      <VisibleItemsSection
        items={visibleItems}
        onDragEnd={onDragEnd}
        toggleItemVisibility={toggleItemVisibility}
      />
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('should render the section header when there are no visible items', () => {
    renderWithI18n(
      <VisibleItemsSection
        items={[]}
        onDragEnd={onDragEnd}
        toggleItemVisibility={toggleItemVisibility}
      />
    );
    expect(screen.getByText('Order and visibility')).toBeInTheDocument();
  });
});
