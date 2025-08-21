/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTabs, EuiTab, EuiPanel } from '@elastic/eui';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  RecentlyAccessedItemsPanel,
  TaggedItemsPanel,
} from '@kbn/content-management-table-list-view-common';
import { getServices } from '../kibana_services';
import { useRecentlyAccessedPanel, useTaggedPanel } from './hooks';
import { FavoritesPanel } from './favorites_panel';

export const HomeContentPanels: React.FC = () => {
  const services = getServices();
  const [selectedTabId, setSelectedTabId] = useState('favorites');
  const [availableTags, setAvailableTags] = useState<
    Array<{ id: string; name: string; color: string }>
  >([]);

  // Initialize localStorage for tag selection persistence
  const storage = new Storage(localStorage);
  const TAGGED_ITEMS_SELECTION_KEY = 'homeTaggedItemsSelection';

  // Load saved tag selection from localStorage
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>(() => {
    try {
      const savedTags = storage.get(TAGGED_ITEMS_SELECTION_KEY) || [];
      return savedTags;
    } catch (e) {
      return [];
    }
  });

  // Get recently accessed items (all types)
  const {
    items: recentlyAccessedItems,
    isLoading: isLoadingRecentlyAccessed,
    error: recentlyAccessedError,
  } = useRecentlyAccessedPanel({
    limit: 10,
    filter: 'all',
  });

  // Load available tags from the tagging service
  useEffect(() => {
    const loadAvailableTags = async () => {
      if (services.taggingCore?.client) {
        try {
          const tags = await services.taggingCore.client.getAll();
          const simpleTags = tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
          }));
          setAvailableTags(simpleTags);
        } catch (error) {
          console.error('Failed to load available tags:', error);
        }
      }
    };

    loadAvailableTags();
  }, [services.taggingCore]);

  // Get tagged items - use selected tags
  const {
    items: taggedItems,
    isLoading: isLoadingTagged,
    error: taggedError,
  } = useTaggedPanel({
    limit: 10,
    tags: selectedTagNames,
    availableTags,
  });

  // Save tag selection to localStorage
  const handleTagSelectionChange = (tagNames: string[]) => {
    try {
      storage.set(TAGGED_ITEMS_SELECTION_KEY, tagNames);
      setSelectedTagNames(tagNames);
    } catch (e) {
      // Fallback to just updating state if localStorage fails
      setSelectedTagNames(tagNames);
    }
  };

  const handleRecentlyAccessedItemSelect = (itemId: string, link: string) => {
    // Handle dashboard URLs by using the application service
    if (link.includes('/app/dashboard') || link.includes('/app/dashboards')) {
      // Extract the dashboard ID from the URL
      const dashboardIdMatch = link.match(/\/view\/([^?#]+)/);
      if (dashboardIdMatch) {
        const dashboardId = dashboardIdMatch[1];
        services.application.navigateToApp('dashboards', {
          path: `#/view/${dashboardId}`,
        });
        return;
      }
    }

    // Handle Discover URLs by using the application service
    if (link.includes('/app/discover')) {
      // Extract the saved search ID from the URL
      const discoverIdMatch = link.match(/\/view\/([^?#]+)/);
      if (discoverIdMatch) {
        const savedSearchId = discoverIdMatch[1];
        services.application.navigateToApp('discover', {
          path: `#/view/${savedSearchId}`,
        });
        return;
      }
    }

    // For other items, use the stored link as-is
    services.application.navigateToUrl(link);
  };

  const handleTaggedItemSelect = (item: any) => {
    const { link } = item;

    // Handle dashboard URLs by using the application service
    if (link.includes('/app/dashboard') || link.includes('/app/dashboards')) {
      // Extract the dashboard ID from the URL
      const dashboardIdMatch = link.match(/\/view\/([^?#]+)/);
      if (dashboardIdMatch) {
        const dashboardId = dashboardIdMatch[1];
        services.application.navigateToApp('dashboards', {
          path: `#/view/${dashboardId}`,
        });
        return;
      }
    }

    // Handle Discover URLs by using the application service
    if (link.includes('/app/discover')) {
      // Extract the saved search ID from the URL
      const discoverIdMatch = link.match(/\/view\/([^?#]+)/);
      if (discoverIdMatch) {
        const savedSearchId = discoverIdMatch[1];
        services.application.navigateToApp('discover', {
          path: `#/view/${savedSearchId}`,
        });
        return;
      }
    }

    // For other items, use the stored link as-is
    services.application.navigateToUrl(link);
  };

  const tabs = [
    {
      id: 'favorites',
      name: 'Favorites',
      content: <FavoritesPanel color="plain" hasBorder paddingSize="m" hideTitle />,
    },
    {
      id: 'recents',
      name: 'Recently viewed',
      content: (
        <RecentlyAccessedItemsPanel
          items={recentlyAccessedItems}
          isLoading={isLoadingRecentlyAccessed}
          error={recentlyAccessedError}
          onItemSelect={handleRecentlyAccessedItemSelect}
          data-test-subj="homeRecentlyAccessedItems"
          filter="all"
          color="plain"
          hasBorder
          paddingSize="m"
          hideTitle
          showPanelWrapper={false}
        />
      ),
    },
  ];

  const onTabClick = (tab: any) => {
    setSelectedTabId(tab.id);
  };

  const selectedTabContent = tabs.find((tab) => tab.id === selectedTabId)?.content;

  return (
    <>
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem style={{ maxWidth: '50%' }}>
          <EuiPanel color="transparent" hasBorder paddingSize="m">
            <EuiTabs>
              {tabs.map((tab) => (
                <EuiTab
                  key={tab.id}
                  onClick={() => onTabClick(tab)}
                  isSelected={tab.id === selectedTabId}
                >
                  {tab.name}
                </EuiTab>
              ))}
            </EuiTabs>
            <EuiSpacer size="m" />
            {selectedTabContent}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem style={{ maxWidth: '50%' }}>
          <TaggedItemsPanel
            items={taggedItems}
            isLoading={isLoadingTagged}
            error={taggedError}
            availableTags={availableTags}
            initialSelectedTags={selectedTagNames
              .map((tagName) => {
                const tag = availableTags.find((t) => t.name === tagName);
                return tag ? tag.id : '';
              })
              .filter((id) => id !== '')}
            onTagsChange={handleTagSelectionChange}
            onItemSelect={handleTaggedItemSelect}
            color="transparent"
            hasBorder
            paddingSize="m"
            hideTitle={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
