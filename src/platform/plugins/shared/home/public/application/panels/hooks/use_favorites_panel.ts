/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import { getServices } from '../../kibana_services';

export interface FavoritesPanelItem {
  id: string;
  type: 'dashboard' | 'search';
  title: string;
  link: string;
  lastAccessed?: string;
}

export interface UseFavoritesPanelReturn {
  items: FavoritesPanelItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useFavoritesPanel = (): UseFavoritesPanelReturn => {
  const [items, setItems] = useState<FavoritesPanelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFavorites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const services = getServices();
      

      
      // Check if favorites service is available
      if (!services.favoritesPoc?.favoritesService) {
        console.log('Falling back to mock data - favorites service not available');
        // Fall back to mock data if service is not available
        setItems([
          {
            id: 'dashboard-1',
            type: 'dashboard',
            title: 'Sample Dashboard',
            link: '/app/dashboard#/view/dashboard-1',
            lastAccessed: '2024-01-15T10:30:00Z',
          },
          {
            id: 'search-1',
            type: 'search',
            title: 'Sample Search',
            link: '/app/discover#/view/search-1',
            lastAccessed: '2024-01-14T15:45:00Z',
          },
        ]);
        return;
      }

      const favoritesService = services.favoritesPoc.favoritesService;
      
      // Get all favorites across types
      const allFavorites = await favoritesService.getAllFavorites();
      
      // Fetch actual titles and metadata for each favorite
      const favoritesItems: FavoritesPanelItem[] = await Promise.all(
        allFavorites.map(async (favorite) => {
          try {
            let title = `${favorite.type === 'search' ? 'Search' : 'Dashboard'} ${favorite.id}`;
            let link = favorite.type === 'search' 
              ? `/app/discover#/view/${favorite.id}`
              : `/app/dashboards#/view/${favorite.id}`;
            
            // Try to get the actual title from the saved object using HTTP API
            try {
              if (favorite.type === 'search') {
                // For saved searches, fetch the saved search to get its title
                const savedSearchResponse = await services.http.get(`/api/saved_objects/search/${favorite.id}`);
                if (savedSearchResponse.attributes?.title) {
                  title = savedSearchResponse.attributes.title;
                }
                
                const savedSearch = await services.application.getUrlForApp('discover', {
                  path: `#/view/${favorite.id}`,
                });
                link = savedSearch;
              } else if (favorite.type === 'dashboard') {
                // For dashboards, fetch the dashboard to get its title
                const dashboardResponse = await services.http.get(`/api/saved_objects/dashboard/${favorite.id}`);
                if (dashboardResponse.attributes?.title) {
                  title = dashboardResponse.attributes.title;
                }
                
                // Use the same URL pattern as Dashboard listing page
                const dashboardUrl = await services.application.getUrlForApp('dashboards', {
                  path: `#/view/${favorite.id}`,
                });
                link = dashboardUrl;
              }
            } catch (err) {
              // Fall back to basic URL if fetching fails
              console.warn('Failed to get title for favorite:', favorite.id, err);
            }
            
            return {
              id: favorite.id,
              type: favorite.type === 'search' ? 'search' : 'dashboard',
              title,
              link,
              lastAccessed: new Date().toISOString(), // Placeholder
            };
          } catch (err) {
            // Fall back to basic info if fetching fails
            return {
              id: favorite.id,
              type: favorite.type === 'search' ? 'search' : 'dashboard',
              title: `${favorite.type === 'search' ? 'Search' : 'Dashboard'} ${favorite.id}`,
              link: favorite.type === 'search' 
                ? `/app/discover#/view/${favorite.id}`
                : `/app/dashboards#/view/${favorite.id}`,
              lastAccessed: new Date().toISOString(),
            };
          }
        })
      );

      setItems(favoritesItems);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch favorites'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return {
    items,
    isLoading,
    error,
    refresh,
  };
};
