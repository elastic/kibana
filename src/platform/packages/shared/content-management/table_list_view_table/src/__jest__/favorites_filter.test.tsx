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
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { FavoritesFilterButton } from '../components/favorites_filter_panel';

describe('FavoritesFilterButton', () => {
  const mockOnToggleFavorites = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (isFavoritesOnly: boolean) => {
    return render(
      <I18nProvider>
        <FavoritesFilterButton
          isFavoritesOnly={isFavoritesOnly}
          onToggleFavorites={mockOnToggleFavorites}
        />
      </I18nProvider>
    );
  };

  test('should render button with correct selected state based on prop', () => {
    const { rerender } = renderComponent(false);

    let button = screen.getByTestId('favoritesFilterButton');
    expect(button).toBeVisible();
    expect(button).not.toHaveAttribute('aria-pressed', 'true');

    // When filter is enabled, button should be selected
    rerender(
      <I18nProvider>
        <FavoritesFilterButton isFavoritesOnly={true} onToggleFavorites={mockOnToggleFavorites} />
      </I18nProvider>
    );

    button = screen.getByTestId('favoritesFilterButton');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  test('should call onToggleFavorites when button is clicked', async () => {
    renderComponent(false);

    const button = screen.getByTestId('favoritesFilterButton');
    await userEvent.click(button);

    expect(mockOnToggleFavorites).toHaveBeenCalledTimes(1);
  });
});
