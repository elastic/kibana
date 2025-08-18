/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import type { EuiTableFieldDataColumnType, EuiSearchBarOnChangeArgs } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiInMemoryTable, EuiLink, EuiText, Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { css } from '@emotion/react';

import { FavoriteStarButton, cssFavoriteHoverWithinTable } from './favorite_star_button';
import { FavoritesService } from '../services/favorites_service';

interface SavedSearchFinderWithFavoritesProps {
  /** The favorites service instance */
  favoritesService: FavoritesService;
  /** Content client for fetching saved searches */
  contentClient: ContentClient;
  /** UI settings client */
  uiSettings: IUiSettingsClient;
  /** Callback when a saved search is chosen */
  onChoose?: (id: string, type: string, name: string, savedObject: SavedObjectCommon) => void;
  /** Message to show when no items are found */
  noItemsMessage?: React.ReactNode;
  /** Whether to show the filter bar */
  showFilter?: boolean;
}

interface SavedSearchItem extends SavedObjectCommon {
  title: string;
  name: string;
  description?: string;
}

/**
 * Custom saved search finder that includes star button functionality.
 * This component mimics the SavedObjectFinder but adds favorites support.
 */
export const SavedSearchFinderWithFavorites: React.FC<SavedSearchFinderWithFavoritesProps> = ({
  favoritesService,
  contentClient,
  uiSettings,
  onChoose,
  noItemsMessage,
  showFilter = true,
}) => {
  console.log('SavedSearchFinderWithFavorites component is rendering!');
  
  const [items, setItems] = useState<SavedSearchItem[]>([]);
  const [isFetchingItems, setIsFetchingItems] = useState(false);
  const [query, setQuery] = useState(Query.parse(''));

  // Configure our service for saved searches
  const savedSearchFavoritesClient = useMemo(() => {
    return favoritesService.configureForApp('discover', 'saved_search');
  }, [favoritesService]);

  // Debounced fetch function
  const debouncedFetch = useMemo(
    () =>
      debounce(async (searchQuery: Query) => {
        try {
          const queryText = searchQuery.text;
          console.log('Fetching saved searches with query:', queryText);

          const response = await contentClient.mSearch<SavedObjectCommon>({
            contentTypes: [{ contentTypeId: 'search' }],
            query: {
              text: queryText ? `${queryText}*` : undefined,
              limit: 100, // TODO: support pagination
            },
          });

          console.log('Saved searches response:', response);

          const savedSearches = response.hits
            .map((savedObject) => {
              const {
                attributes: { name, title, description },
              } = savedObject;
              const titleToUse = typeof title === 'string' ? title : '';
              const nameToUse = name ? name : titleToUse;
              return {
                ...savedObject,
                title: titleToUse,
                name: nameToUse,
                description,
              };
            })
            .filter((savedObject) => {
              // Filter out ES|QL based saved searches if needed
              return (savedObject.attributes as any).isTextBasedQuery !== true;
            });

          console.log('Processed saved searches:', savedSearches);
          setItems(savedSearches);
        } catch (error) {
          console.error('Error fetching saved searches:', error);
          setItems([]);
        } finally {
          setIsFetchingItems(false);
        }
      }, 300),
    [contentClient]
  );

  // Fetch items when component mounts or query changes
  useEffect(() => {
    setIsFetchingItems(true);
    debouncedFetch(query);
  }, [query, debouncedFetch]);

  // Cleanup debounced function
  useEffect(() => {
    return () => {
      debouncedFetch.cancel();
    };
  }, [debouncedFetch]);

  // Define table columns
  const columns: Array<EuiTableFieldDataColumnType<SavedSearchItem>> = [
    {
      field: 'title',
      name: i18n.translate('savedObjectsFinder.titleName', {
        defaultMessage: 'Title',
      }),
      width: '100%',
      description: i18n.translate('savedObjectsFinder.titleDescription', {
        defaultMessage: 'Title of the saved object',
      }),
      dataType: 'string',
      sortable: ({ name }) => name?.toLowerCase(),
      'data-test-subj': 'savedObjectFinderTitle',
      render: (_, item) => {
        const fullName = `${item.name} (Discover session)`;

        const link = (
          <EuiLink
            onClick={
              onChoose
                ? () => {
                    onChoose(item.id, item.type, fullName, item);
                  }
                : undefined
            }
            title={fullName}
            data-test-subj={`savedObjectTitle${(item.title || '').split(' ').join('-')}`}
          >
            {item.name}
          </EuiLink>
        );

        const description = !!item.description && (
          <EuiText size="xs" color="subdued">
            {item.description}
          </EuiText>
        );

        return (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={true}>
              {link}
              {description}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FavoriteStarButton
                type="saved_search"
                id={item.id}
                favoritesService={favoritesService}
                onFavoriteChange={(isFavorite) => {
                  // Handle favorite change
                }}
                alwaysShow={true}
                className="favorite-star-button--empty"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
  ];

  const search = showFilter
    ? {
        onChange: (args: EuiSearchBarOnChangeArgs) => {
          if (args.query) {
            setQuery(args.query);
          }
        },
        box: {
          incremental: true,
          'data-test-subj': 'savedObjectFinderSearchInput',
          autoFocus: true,
          placeholder: i18n.translate('savedObjectsFinder.searchPlaceholder', {
            defaultMessage: 'Search saved searches...',
          }),
        },
      }
    : undefined;

  const pagination = {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 15, 25],
    showPerPageOptions: true,
  };

  return (
    <div
      css={css`
        ${cssFavoriteHoverWithinTable({
          animation: { fast: '150ms', resistance: 'cubic-bezier(0.694, 0, 0.335, 1)' },
        })}
      `}
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiInMemoryTable
            loading={isFetchingItems}
            itemId="id"
            items={items}
            columns={columns}
            data-test-subj="savedObjectsFinderTable"
            message={noItemsMessage}
            search={search}
            pagination={pagination}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
