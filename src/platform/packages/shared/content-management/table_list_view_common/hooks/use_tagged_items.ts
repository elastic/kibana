/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { TaggedItem } from '../components/tagged_items_panel';
import type { ITagsClient, TaggedObject } from '@kbn/tagging-core-plugin/common';

export interface UseTaggedItemsOptions {
  limit?: number;
  tags?: string[];
  tagsClient?: ITagsClient;
  isContentManagementReady?: () => boolean;
  availableTags?: Array<{ id: string; name: string; color: string }>;
}

export interface UseTaggedItemsResult {
  items: TaggedItem[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useTaggedItems = (options: UseTaggedItemsOptions = {}): UseTaggedItemsResult => {
  const { limit = 10, tags = [], tagsClient, isContentManagementReady, availableTags = [] } = options;
  const [items, setItems] = useState<TaggedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to always access current availableTags
  const availableTagsRef = useRef(availableTags);
  availableTagsRef.current = availableTags;

  const fetchItems = useCallback(async () => {
    if (!tagsClient) {
      // Fallback to mock data if no tags client available
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

      const filteredItems = tags.length === 0 
        ? mockItems.slice(0, limit)
        : mockItems.filter(item => item.tags.some(tag => tags.includes(tag))).slice(0, limit);
      
      setItems(filteredItems);
      setIsLoading(false);
      return;
    }

    // Check if content management service is ready
    if (isContentManagementReady && !isContentManagementReady()) {
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

      const filteredItems = tags.length === 0 
        ? mockItems.slice(0, limit)
        : mockItems.filter(item => item.tags.some(tag => tags.includes(tag))).slice(0, limit);
      
      setItems(filteredItems);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Convert tag names to tag IDs
      const tagIds: string[] = [];
      for (const tagName of tags) {
        const tag = availableTagsRef.current.find(t => t.name === tagName);
        if (tag) {
          tagIds.push(tag.id);
        }
      }

      if (tagIds.length === 0) {
        setItems([]);
        return;
      }

      // Search for objects with the specified tags
      const taggedObjects: TaggedObject[] = await tagsClient.findObjectsByTags(tagIds, limit);
      
      // Convert TaggedObject to TaggedItem
      const taggedItems: TaggedItem[] = taggedObjects.map(obj => ({
        id: obj.id,
        title: obj.title,
        type: obj.type,
        link: obj.link,
        tags: obj.tags,
      }));

      setItems(taggedItems);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tagged items'));
    } finally {
      setIsLoading(false);
    }
  }, [limit, tagsClient, isContentManagementReady, tags]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, tagsClient]);

  // Re-run when availableTags loads
  useEffect(() => {
    if (availableTags.length > 0 && tags.length > 0) {
      fetchItems();
    }
  }, [availableTags.length, tags.length]);

  const refresh = useCallback(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    isLoading,
    error,
    refresh,
  };
};
