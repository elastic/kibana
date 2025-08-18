/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';


import type { TableListViewTableProps, OpenContentEditorParams } from '@kbn/content-management-table-list-view-table';
import type { SavedObjectsFindOptionsReference } from '@kbn/core/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';

import { DISCOVER_CONTENT_ID } from '../../utils/telemetry_constants';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getDiscoverCapabilities } from '../get_discover_capabilities';
import { discoverListingErrorStrings, discoverListingTableStrings } from '../_discover_listing_strings';
import { DiscoverListingEmptyPrompt } from '../discover_listing_empty_prompt';
import type { DiscoverSavedObjectUserContent } from '../types';

type GetDetailViewLink =
  TableListViewTableProps<DiscoverSavedObjectUserContent>['getDetailViewLink'];

const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

const toTableListViewSavedObject = (
  hit: any // TODO: Replace with proper type from content management
): DiscoverSavedObjectUserContent => {
  const { title, description } = hit.attributes;
  return {
    type: 'search',
    id: hit.id,
    updatedAt: hit.updatedAt!,
    createdAt: hit.createdAt,
    createdBy: hit.createdBy,
    updatedBy: hit.updatedBy,
    references: hit.references ?? [],
    managed: hit.managed,
    attributes: {
      title,
      description,
    },
  };
};

interface UpdateSavedSearchMetaProps {
  id: string;
  title: string;
  description?: string;
  tags: string[];
}

type DiscoverListingViewTableProps = Omit<
  TableListViewTableProps<DiscoverSavedObjectUserContent>,
  'tableCaption'
> & { title: string };

interface UseDiscoverListingTableReturnType {
  hasInitialFetchReturned: boolean;
  pageDataTestSubject: string | undefined;
  tableListViewTableProps: DiscoverListingViewTableProps;
}

export const useDiscoverListingTable = ({
  discoverListingId = 'discover',
  headingId = 'discoverListingHeading',
  initialFilter,
  urlStateEnabled,
}: {
  discoverListingId?: string;
  headingId?: string;
  initialFilter?: string;
  urlStateEnabled?: boolean;
} = {}): UseDiscoverListingTableReturnType => {
  const { getEntityName, getTableListTitle, getEntityNamePlural } = discoverListingTableStrings;
  const title = getTableListTitle();
  const entityName = getEntityName();
  const entityNamePlural = getEntityNamePlural();
  const [pageDataTestSubject, setPageDataTestSubject] = useState<string>();
  const [hasInitialFetchReturned, setHasInitialFetchReturned] = useState(false);

  const services = useDiscoverServices();
  const {
    contentManagement,
    uiSettings,
    notifications,
    analytics,
  } = services;

  const listingLimit = uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

  const createItem = useCallback(() => {
    // Navigate to Discover create page to create a new search
    // Use the same pattern as Dashboard's create functionality
    const currentUrl = window.location.href;
    const baseUrl = currentUrl.split('/app/discover')[0];
    
    // Navigate to the create route (equivalent to Dashboard's /create)
    window.location.href = `${baseUrl}/app/discover#/create`;
  }, []);



  const emptyPrompt = useMemo(
    () => (
      <DiscoverListingEmptyPrompt
        createItem={createItem}
        goToDiscover={() => console.log('Go to discover')}
      />
    ),
    [createItem]
  );

  const findItems = useCallback(
    (
      searchTerm: string,
      {
        references,
        referencesToExclude,
      }: {
        references?: SavedObjectsFindOptionsReference[];
        referencesToExclude?: SavedObjectsFindOptionsReference[];
      } = {}
    ) => {
      const searchStartTime = window.performance.now();

      return contentManagement.client
        .search({
          contentTypeId: 'search',
          query: {
            text: searchTerm ? `${searchTerm}*` : undefined,
          },
          options: {
            // Include necessary fields for the table and activity section
            fields: ['title', 'description', 'tags'],
            // Include references for tags
            includeReferences: ['tag'],
            limit: listingLimit,
          },
        })
        .then((response) => {
          const searchEndTime = window.performance.now();
          const searchDuration = searchEndTime - searchStartTime;
          reportPerformanceMetricEvent(analytics, {
            eventName: 'discover_saved_search_loaded_time',
            duration: searchDuration,
            meta: {
              saved_object_type: DISCOVER_CONTENT_ID,
            },
          });
          return {
            total: response.hits.length,
            hits: response.hits.map(toTableListViewSavedObject),
          };
        });
    },
    [listingLimit, contentManagement.client, analytics]
  );

  const updateItemMeta = useCallback(
    async (props: UpdateSavedSearchMetaProps) => {
      try {
        const { id, title, description = '', tags } = props;
        
        // Get the current saved search to preserve existing references
        const savedSearch = await contentManagement.client.get({
          contentTypeId: 'search',
          id,
        });

        if (!savedSearch?.item) {
          throw new Error('Saved search not found');
        }

        // Update tags references if tagging service is available
        const savedObjectsTaggingApi = services.savedObjectsTagging;
        const references = savedObjectsTaggingApi?.ui.updateTagsReferences && tags.length
          ? savedObjectsTaggingApi.ui.updateTagsReferences(savedSearch.item.references || [], tags)
          : savedSearch.item.references || [];

        // Update the saved search - preserve all existing attributes and only update title/description
        await contentManagement.client.update({
          contentTypeId: 'search',
          id,
          data: {
            ...savedSearch.item.attributes,
            title,
            description,
          },
          options: { references },
        });
      } catch (error) {
        notifications.toasts.addError(error, {
          title: discoverListingErrorStrings.getErrorUpdatingSearchToast(),
        });
      }
    },
    [contentManagement.client, services.savedObjectsTagging, notifications.toasts]
  );

  const contentEditorValidators: OpenContentEditorParams['customValidators'] = useMemo(
    () => ({
      title: [
        {
          type: 'warning',
          fn: async (value: string, id: string) => {
            if (id) {
              try {
                const response = await contentManagement.client.search({
                  contentTypeId: 'search',
                  query: { text: `"${value}"` },
                  options: {
                    searchFields: ['title'],
                    fields: ['title'],
                  },
                });

                const hasDuplicate = response.hits.some(
                  (obj) => obj.id !== id && obj.attributes.title.toLowerCase() === value.toLowerCase()
                );

                if (hasDuplicate) {
                  throw new Error(discoverListingErrorStrings.getDuplicateTitleWarning(value));
                }
              } catch (e) {
                return e.message;
              }
            }
          },
        },
      ],
    }),
    [contentManagement.client]
  );

  const deleteItems = useCallback(
    async (searchesToDelete: Array<{ id: string }>) => {
      try {
        const deleteStartTime = window.performance.now();

        const deletePromises = searchesToDelete.map(({ id }) =>
          contentManagement.client.delete({
            contentTypeId: 'search',
            id,
          })
        );

        await Promise.all(deletePromises);

        const deleteDuration = window.performance.now() - deleteStartTime;
        reportPerformanceMetricEvent(analytics, {
          eventName: 'discover_saved_search_delete_time',
          duration: deleteDuration,
          meta: {
            saved_object_type: DISCOVER_CONTENT_ID,
            total: searchesToDelete.length,
          },
        });
      } catch (error) {
        notifications.toasts.addError(error, {
          title: discoverListingErrorStrings.getErrorDeletingSearchToast(),
        });
      }
    },
    [contentManagement.client, notifications.toasts, analytics]
  );



  const onFetchSuccess = useCallback(() => {
    if (!hasInitialFetchReturned) {
      setHasInitialFetchReturned(true);
    }
  }, [hasInitialFetchReturned]);

  const getDetailViewLink = useCallback<NonNullable<GetDetailViewLink>>(
    ({ id }) => {
      // Use the Discover locator to generate the proper URL with all necessary parameters
      return services.locator.getRedirectUrl({ savedSearchId: id });
    },
    [services.locator]
  );

  const tableListViewTableProps: DiscoverListingViewTableProps = useMemo(() => {
    const { showWriteControls } = getDiscoverCapabilities(services);
    
    return {
      contentEditor: {
        isReadonly: !showWriteControls,
        onSave: updateItemMeta,
        customValidators: contentEditorValidators,
      },
      createItem: !showWriteControls ? undefined : createItem,
      deleteItems: !showWriteControls ? undefined : deleteItems,
      emptyPrompt,
      entityName,
      entityNamePlural,
      findItems,
      getDetailViewLink,
      headingId,
      id: discoverListingId,
      initialFilter,
      initialPageSize,
      listingLimit,
      onFetchSuccess,
      setPageDataTestSubject,
      title,
      urlStateEnabled,
      createdByEnabled: true,
      recentlyAccessed: undefined, // TODO: Add recently accessed service
    };
  }, [
    contentEditorValidators,
    createItem,
    discoverListingId,
    deleteItems,
    emptyPrompt,
    entityName,
    entityNamePlural,
    findItems,
    getDetailViewLink,
    headingId,
    initialFilter,
    initialPageSize,
    listingLimit,
    onFetchSuccess,
    title,
    updateItemMeta,
    urlStateEnabled,
  ]);

  return {
    hasInitialFetchReturned,
    pageDataTestSubject,
    tableListViewTableProps,
  };
};

