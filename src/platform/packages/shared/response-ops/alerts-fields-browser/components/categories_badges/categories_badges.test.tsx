/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
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
    renderComponent();

    const badges = screen.getByTestId('category-badges');
    expect(badges).toBeInTheDocument();
    expect(badges.childNodes.length).toBe(0);
  });

  it('should render the selector button with selected categories', () => {
    renderComponent({ selectedCategoryIds: ['base', 'event'] });

    const badges = screen.getByTestId('category-badges');
    expect(badges.childNodes.length).toBe(2);
    expect(screen.getByTestId('category-badge-base')).toBeInTheDocument();
    expect(screen.getByTestId('category-badge-event')).toBeInTheDocument();
  });

  it('should call the set selected callback when badge unselect button clicked', () => {
    renderComponent({ selectedCategoryIds: ['base', 'event'] });

    screen.getByTestId('category-badge-unselect-base').click();
    expect(mockSetSelectedCategoryIds).toHaveBeenCalledWith(['event']);
  });
});
