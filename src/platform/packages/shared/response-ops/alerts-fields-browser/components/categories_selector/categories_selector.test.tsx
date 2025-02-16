/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
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
    const result = render(<CategoriesSelector {...defaultProps} />);

    expect(result.getByTestId('categories-filter-button')).toBeInTheDocument();
    expect(result.getByText('Categories')).toBeInTheDocument();
    expect(result.getByText(categoriesCount)).toBeInTheDocument();
  });

  it('should render the selector button with selected categories', () => {
    const result = render(
      <CategoriesSelector {...defaultProps} selectedCategoryIds={['base', 'event']} />
    );

    expect(result.getByTestId('categories-filter-button')).toBeInTheDocument();
    expect(result.getByText('Categories')).toBeInTheDocument();
    expect(result.getByText('2')).toBeInTheDocument();
  });

  it('should open the category selector', async () => {
    const result = render(<CategoriesSelector {...defaultProps} />);

    result.getByTestId('categories-filter-button').click();
    await waitForEuiPopoverOpen();

    expect(result.getByTestId('categories-selector-search')).toBeInTheDocument();
    expect(result.getByTestId(`categories-selector-option-base`)).toBeInTheDocument();
  });

  it('should open the category selector with selected categories', async () => {
    const result = render(
      <CategoriesSelector {...defaultProps} selectedCategoryIds={['base', 'event']} />
    );

    result.getByTestId('categories-filter-button').click();
    await waitForEuiPopoverOpen();

    expect(result.getByTestId('categories-selector-search')).toBeInTheDocument();
    expect(result.getByTestId(`categories-selector-option-base`)).toBeInTheDocument();
    expect(result.getByTestId(`categories-selector-option-name-base`)).toBeInTheDocument();
  });

  it('should call setSelectedCategoryIds when category selected', async () => {
    const result = render(<CategoriesSelector {...defaultProps} />);

    result.getByTestId('categories-filter-button').click();
    await waitForEuiPopoverOpen();

    result.getByTestId(`categories-selector-option-base`).click();
    expect(mockSetSelectedCategoryIds).toHaveBeenCalledWith(['base']);
  });
});
