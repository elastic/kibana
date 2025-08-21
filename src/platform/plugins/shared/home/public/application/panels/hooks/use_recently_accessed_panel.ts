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
import type { RecentlyAccessedItem, RecentlyAccessedFilter } from '@kbn/content-management-table-list-view-common';

export interface UseRecentlyAccessedPanelOptions {
  limit?: number;
  refresh?: boolean;
  filter?: RecentlyAccessedFilter;
}

export interface UseRecentlyAccessedPanelReturn {
  items: RecentlyAccessedItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useRecentlyAccessedPanel = (
  options: UseRecentlyAccessedPanelOptions = {}
): UseRecentlyAccessedPanelReturn => {
  const { limit = 10, refresh: refreshFlag = false, filter = 'all' } = options;
  const [items, setItems] = useState<RecentlyAccessedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const services = getServices();
      const recentlyAccessedService = services.chrome.recentlyAccessed;

      // Get all recently accessed items
      const recentlyAccessedItems = recentlyAccessedService.get();

      // Filter items based on the filter option
      let filteredItems = recentlyAccessedItems;
      if (filter !== 'all') {
        filteredItems = recentlyAccessedItems.filter((item) => {
          const link = item.link.toLowerCase();
          if (filter === 'discover') {
            return link.includes('/app/discover');
          }
          if (filter === 'dashboard') {
            return link.includes('/app/dashboard');
          }
          return true;
        });
      }

      // Take the limit (most recent first since they're already ordered)
      const limitedItems = filteredItems
        .slice(0, limit)
        .map((item) => {
          // Determine the actual type from the URL
          const link = item.link.toLowerCase();
          let type = 'unknown';
          
          if (link.includes('/app/discover') || link.includes('/discover')) {
            type = 'discover';
          } else if (link.includes('/app/dashboard') || link.includes('/dashboards')) {
            type = 'dashboard';
          } else if (link.includes('/app/visualize') || link.includes('/visualize')) {
            type = 'visualize';
          } else if (link.includes('/app/maps') || link.includes('/maps')) {
            type = 'maps';
          } else if (link.includes('/app/canvas') || link.includes('/canvas')) {
            type = 'canvas';
          } else if (link.includes('/app/ml') || link.includes('/machine-learning')) {
            type = 'ml';
          }
          
          return {
            id: item.id,
            title: item.label,
            link: item.link,
            type,
          };
        });

      setItems(limitedItems);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch recently accessed items'));
    } finally {
      setIsLoading(false);
    }
  }, [limit, filter]);

  const refresh = useCallback(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshFlag]);

  return {
    items,
    isLoading,
    error,
    refresh,
  };
};
