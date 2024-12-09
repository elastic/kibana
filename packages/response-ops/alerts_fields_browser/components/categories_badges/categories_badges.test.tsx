/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { CategoriesBadges, CategoriesBadgesProps } from './categories_badges';

const mockSetSelectedCategoryIds = jest.fn();
const defaultProps = {
  setSelectedCategoryIds: mockSetSelectedCategoryIds,
  selectedCategoryIds: [],
};

const renderComponent = (props: Partial<CategoriesBadgesProps> = {}) =>
  render(<CategoriesBadges {...{ ...defaultProps, ...props }} />);

describe('CategoriesBadges', () => {
  beforeEach(() => {
    mockSetSelectedCategoryIds.mockClear();
  });

  it('should render empty badges', () => {
    const result = renderComponent();

    const badges = result.getByTestId('category-badges');
    expect(badges).toBeInTheDocument();
    expect(badges.childNodes.length).toBe(0);
  });

  it('should render the selector button with selected categories', () => {
    const result = renderComponent({ selectedCategoryIds: ['base', 'event'] });

    const badges = result.getByTestId('category-badges');
    expect(badges.childNodes.length).toBe(2);
    expect(result.getByTestId('category-badge-base')).toBeInTheDocument();
    expect(result.getByTestId('category-badge-event')).toBeInTheDocument();
  });

  it('should call the set selected callback when badge unselect button clicked', () => {
    const result = renderComponent({ selectedCategoryIds: ['base', 'event'] });

    result.getByTestId('category-badge-unselect-base').click();
    expect(mockSetSelectedCategoryIds).toHaveBeenCalledWith(['event']);
  });
});
