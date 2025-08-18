/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiTable, EuiTableHeader, EuiTableHeaderCell, EuiTableBody, EuiTableRow, EuiTableRowCell } from '@elastic/eui';
import { cssFavoriteHoverWithinTable } from './favorite_star_button';
import { FavoriteStarButton } from './favorite_star_button';
import { FavoritesService } from '../services/favorites_service';
import { useEuiTheme } from '@elastic/eui';

interface DashboardItem {
  id: string;
  title: string;
  description?: string;
  lastModified: string;
}

interface DashboardStarButtonIntegrationProps {
  /** The favorites service instance */
  favoritesService: FavoritesService;
  /** Sample dashboard items to display */
  items?: DashboardItem[];
}

/**
 * Example component showing how to integrate our FavoriteStarButton
 * into a Dashboard listing table with hover-to-show functionality.
 * 
 * This demonstrates how our star button can be used as a drop-in
 * replacement for the existing favorites system.
 */
export const DashboardStarButtonIntegration: React.FC<DashboardStarButtonIntegrationProps> = ({
  favoritesService,
  items = [],
}) => {
  const { euiTheme } = useEuiTheme();

  // Sample data if none provided
  const dashboardItems = useMemo(() => {
    if (items.length > 0) {
      return items;
    }

    return [
      {
        id: 'dashboard-1',
        title: 'Sample Dashboard',
        description: 'A sample dashboard for testing',
        lastModified: '2024-01-15T10:30:00Z',
      },
      {
        id: 'dashboard-2',
        title: 'Analytics Dashboard',
        description: 'Dashboard for analytics data',
        lastModified: '2024-01-14T15:45:00Z',
      },
      {
        id: 'dashboard-3',
        title: 'Monitoring Dashboard',
        description: 'System monitoring dashboard',
        lastModified: '2024-01-13T09:20:00Z',
      },
    ];
  }, [items]);

  const handleFavoriteChange = (dashboardId: string, isFavorite: boolean) => {
    console.log(`Dashboard ${dashboardId} is now ${isFavorite ? 'favorited' : 'unfavorited'}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <h2>Dashboard Listing with Star Buttons</h2>
      <p>Hover over any row to see the star button appear. Click to toggle favorite status.</p>
      
      <EuiTable
        css={cssFavoriteHoverWithinTable(euiTheme)}
        data-test-subj="dashboard-star-button-table"
      >
        <EuiTableHeader>
          <EuiTableHeaderCell>Title</EuiTableHeaderCell>
          <EuiTableHeaderCell>Description</EuiTableHeaderCell>
          <EuiTableHeaderCell>Last Modified</EuiTableHeaderCell>
          <EuiTableHeaderCell width="60px">Actions</EuiTableHeaderCell>
        </EuiTableHeader>
        <EuiTableBody>
          {dashboardItems.map((item) => (
            <EuiTableRow key={item.id}>
              <EuiTableRowCell>
                <strong>{item.title}</strong>
              </EuiTableRowCell>
              <EuiTableRowCell>
                {item.description}
              </EuiTableRowCell>
              <EuiTableRowCell>
                {formatDate(item.lastModified)}
              </EuiTableRowCell>
              <EuiTableRowCell>
                <FavoriteStarButton
                  type="dashboard"
                  id={item.id}
                  favoritesService={favoritesService}
                  onFavoriteChange={(isFavorite) => handleFavoriteChange(item.id, isFavorite)}
                />
              </EuiTableRowCell>
            </EuiTableRow>
          ))}
        </EuiTableBody>
      </EuiTable>
    </div>
  );
};

/**
 * Example showing how to use the Dashboard star button integration
 */
export const DashboardStarButtonIntegrationExample: React.FC = () => {
  // Initialize our favorites service
  const favoritesService = useMemo(() => {
    return new FavoritesService({
      http: {} as any, // Mock for example
      userProfile: {} as any,
      usageCollection: {} as any,
    });
  }, []);

  return (
    <DashboardStarButtonIntegration
      favoritesService={favoritesService}
    />
  );
};
