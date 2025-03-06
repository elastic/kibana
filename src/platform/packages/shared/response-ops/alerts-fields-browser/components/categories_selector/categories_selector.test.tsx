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
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { mockBrowserFields } from '../../mock';
import { CategoriesSelector } from './categories_selector';

const mockSetSelectedCategoryIds = jest.fn();
const defaultProps = {
  filteredBrowserFields: mockBrowserFields,
  setSelectedCategoryIds: mockSetSelectedCategoryIds,
  selectedCategoryIds: [],
};

describe('CategoriesSelector', () => {
  beforeEach(() => {
    mockSetSelectedCategoryIds.mockClear();
  });

  it('should render the default selector button', () => {
    const categoriesCount = Object.keys(mockBrowserFields).length;
    render(<CategoriesSelector {...defaultProps} />);

    expect(screen.getByTestId('categories-filter-button')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText(categoriesCount)).toBeInTheDocument();
  });

  it('should render the selector button with selected categories', () => {
    render(<CategoriesSelector {...defaultProps} selectedCategoryIds={['base', 'event']} />);

    expect(screen.getByTestId('categories-filter-button')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should open the category selector', async () => {
    render(<CategoriesSelector {...defaultProps} />);

    screen.getByTestId('categories-filter-button').click();
    await waitForEuiPopoverOpen();

    expect(screen.getByTestId('categories-selector-search')).toBeInTheDocument();
    expect(screen.getByTestId(`categories-selector-option-base`)).toBeInTheDocument();
  });

  it('should open the category selector with selected categories', async () => {
    render(<CategoriesSelector {...defaultProps} selectedCategoryIds={['base', 'event']} />);

    screen.getByTestId('categories-filter-button').click();
    await waitForEuiPopoverOpen();

    expect(screen.getByTestId('categories-selector-search')).toBeInTheDocument();
    expect(screen.getByTestId(`categories-selector-option-base`)).toBeInTheDocument();
    expect(screen.getByTestId(`categories-selector-option-name-base`)).toBeInTheDocument();
  });

  it('should call setSelectedCategoryIds when category selected', async () => {
    render(<CategoriesSelector {...defaultProps} />);

    screen.getByTestId('categories-filter-button').click();
    await waitForEuiPopoverOpen();

    screen.getByTestId(`categories-selector-option-base`).click();
    expect(mockSetSelectedCategoryIds).toHaveBeenCalledWith(['base']);
  });
});
