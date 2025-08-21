/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect, useMemo } from 'react';
import type { TaggedItem } from '../components/tagged_items_panel';

export interface UseTaggedItemsOptions {
  limit?: number;
  tags?: string[];
}

export interface UseTaggedItemsResult {
  items: TaggedItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useTaggedItems = (options: UseTaggedItemsOptions = {}): UseTaggedItemsResult => {
  const { limit = 10, tags = [] } = options;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Mock data for now
  const mockItems: TaggedItem[] = [
    {
      id: 'dashboard-1',
      title: 'Sample Dashboard',
      type: 'dashboard',
      link: '/app/dashboards#/view/dashboard-1',
      tags: ['tag1', 'tag2'],
    },
    {
      id: 'discover-1',
      title: 'Sample Discover',
      type: 'discover',
      link: '/app/discover#/view/discover-1',
      tags: ['tag1'],
    },
  ];

  const items = useMemo(() => {
    if (tags.length === 0) {
      return mockItems.slice(0, limit);
    }
    return mockItems
      .filter(item => item.tags.some(tag => tags.includes(tag)))
      .slice(0, limit);
  }, [tags, limit]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const refresh = () => {
    setIsLoading(true);
    setError(null);
    // Simulate refresh
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  return {
    items,
    isLoading,
    error,
    refresh,
  };
};
