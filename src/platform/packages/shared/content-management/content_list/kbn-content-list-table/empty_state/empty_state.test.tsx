/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { renderWithIntlEui } from '../test_utils';
import { NoItemsEmptyState } from './no_items';
import { NoResultsEmptyState } from './no_results';
import { ErrorEmptyState } from './error';

describe('Content List Empty States', () => {
  it('renders no items empty state with create action', async () => {
    const onCreate = jest.fn();

    await renderWithIntlEui(
      <NoItemsEmptyState entityName="dashboard" entityNamePlural="dashboards" onCreate={onCreate} />
    );

    expect(screen.getByText('Create your first dashboard')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create dashboard' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('renders no results empty state with clear actions', async () => {
    const onClearSearch = jest.fn();
    const onClearFilters = jest.fn();

    await renderWithIntlEui(
      <NoResultsEmptyState
        entityName="dashboard"
        entityNamePlural="dashboards"
        hasSearch={true}
        hasActiveFilters={true}
        onClearSearch={onClearSearch}
        onClearFilters={onClearFilters}
      />
    );

    await userEvent.click(screen.getByTestId('content-list-empty-clear-search-button'));
    await userEvent.click(screen.getByTestId('content-list-empty-clear-filters-button'));

    expect(onClearSearch).toHaveBeenCalledTimes(1);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('hides clear actions when callbacks are missing', async () => {
    await renderWithIntlEui(
      <NoResultsEmptyState
        entityName="dashboard"
        entityNamePlural="dashboards"
        hasSearch={true}
        hasActiveFilters={true}
      />
    );

    expect(screen.queryByTestId('content-list-empty-clear-search-button')).toBeNull();
    expect(screen.queryByTestId('content-list-empty-clear-filters-button')).toBeNull();
  });

  it('renders error empty state with retry button', async () => {
    const onRetry = jest.fn();
    const error = new Error('Request failed');

    await renderWithIntlEui(
      <ErrorEmptyState
        entityName="dashboard"
        entityNamePlural="dashboards"
        onRetry={onRetry}
        error={error}
      />
    );

    expect(screen.getByText('Unable to load dashboards')).toBeInTheDocument();
    expect(screen.getByText(error.message)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
