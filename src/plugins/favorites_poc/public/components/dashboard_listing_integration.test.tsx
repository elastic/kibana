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
import { DashboardListingIntegration } from './dashboard_listing_integration';

// Mock dependencies
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useExecutionContext: jest.fn(),
}));

jest.mock('@kbn/content-management-table-list-view', () => ({
  TableListView: ({ children }: any) => <div data-testid="table-list-view">{children}</div>,
}));

jest.mock('@kbn/content-management-table-list-view-table', () => ({
  TableListViewKibanaProvider: ({ children, favorites }: any) => (
    <div data-testid="table-list-view-kibana-provider" data-favorites-type={typeof favorites}>
      {children}
    </div>
  ),
}));

jest.mock('@kbn/i18n-react', () => ({
  I18nProvider: ({ children }: any) => <div data-testid="i18n-provider">{children}</div>,
  FormattedRelative: () => <span>FormattedRelative</span>,
}));

jest.mock('@tanstack/react-query', () => ({
  QueryClientProvider: ({ children }: any) => (
    <div data-testid="query-client-provider">{children}</div>
  ),
}));

// Mock FavoritesService
const mockFavoritesService = {
  configureForApp: jest.fn(() => ({
    getFavorites: jest.fn(),
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
    isAvailable: jest.fn(),
    getFavoriteType: jest.fn(),
    reportAddFavoriteClick: jest.fn(),
    reportRemoveFavoriteClick: jest.fn(),
  })),
} as any;

describe('DashboardListingIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the dashboard listing with our favorites service', () => {
    const goToDashboard = jest.fn();
    const getDashboardUrl = jest.fn();

    render(
      <DashboardListingIntegration
        favoritesService={mockFavoritesService}
        goToDashboard={goToDashboard}
        getDashboardUrl={getDashboardUrl}
        useSessionStorageIntegration={false}
      />
    );

    // Verify that our service was configured for the Dashboard app
    expect(mockFavoritesService.configureForApp).toHaveBeenCalledWith('dashboard', 'dashboard');

    // Verify that the component structure is rendered
    expect(screen.getByTestId('i18n-provider')).toBeInTheDocument();
    expect(screen.getByTestId('query-client-provider')).toBeInTheDocument();
    expect(screen.getByTestId('table-list-view-kibana-provider')).toBeInTheDocument();
    expect(screen.getByTestId('table-list-view')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-unsaved-listing')).toBeInTheDocument();
  });

  it('should pass the configured favorites service to TableListViewKibanaProvider', () => {
    const goToDashboard = jest.fn();
    const getDashboardUrl = jest.fn();

    render(
      <DashboardListingIntegration
        favoritesService={mockFavoritesService}
        goToDashboard={goToDashboard}
        getDashboardUrl={getDashboardUrl}
        useSessionStorageIntegration={false}
      />
    );

    // Verify that the favorites service was configured and passed through
    expect(mockFavoritesService.configureForApp).toHaveBeenCalledWith('dashboard', 'dashboard');

    const kibanaProvider = screen.getByTestId('table-list-view-kibana-provider');
    expect(kibanaProvider).toHaveAttribute('data-favorites-type', 'object');
  });

  it('should handle children prop correctly', () => {
    const goToDashboard = jest.fn();
    const getDashboardUrl = jest.fn();

    render(
      <DashboardListingIntegration
        favoritesService={mockFavoritesService}
        goToDashboard={goToDashboard}
        getDashboardUrl={getDashboardUrl}
        useSessionStorageIntegration={false}
      >
        <div data-testid="custom-children">Custom Content</div>
      </DashboardListingIntegration>
    );

    expect(screen.getByTestId('custom-children')).toBeInTheDocument();
  });
});
