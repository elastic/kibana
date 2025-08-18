/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';

export interface RecentlyAccessedItem {
  id: string;
  title: string;
  link: string;
  type?: string;
}

export type RecentlyAccessedFilter = 'discover' | 'dashboard' | 'all';

export interface UseRecentlyAccessedItemsOptions {
  limit?: number;
  refresh?: boolean;
  filter?: RecentlyAccessedFilter;
}

export interface UseRecentlyAccessedItemsReturn {
  items: RecentlyAccessedItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useRecentlyAccessedItems = (
  recentlyAccessedService: any, // We'll type this properly later
  options: UseRecentlyAccessedItemsOptions = {}
): UseRecentlyAccessedItemsReturn => {
  const { limit = 10, refresh: refreshFlag = false, filter = 'all' } = options;
  const [items, setItems] = useState<RecentlyAccessedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

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
        .map((item) => ({
          id: item.id,
          title: item.label,
          link: item.link,
          type: filter === 'all' ? 'recently-accessed' : filter,
        }));

      setItems(limitedItems);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch recently accessed items'));
    } finally {
      setIsLoading(false);
    }
  }, [recentlyAccessedService, limit, filter]);

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
