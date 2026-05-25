/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, type ReactNode } from 'react';
import type {
  ContentListClientFeatures,
  ContentListClientProviderProps,
  ContentListClientServices,
  TableListViewFindItemsFn,
} from '@kbn/content-list-provider-client';
import { ContentListClientProvider, createTagsService } from '@kbn/content-list-provider-client';

import { i18n } from '@kbn/i18n';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-components';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import type { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { DataViewFilterDefinition, DataViewSortField } from './data_view_filter';

const labels = {
  entity: i18n.translate('eventAnnotationListing.tableList.entityName', {
    defaultMessage: 'annotation group',
  }),
  entityPlural: i18n.translate('eventAnnotationListing.tableList.entityNamePlural', {
    defaultMessage: 'annotation groups',
  }),
};

export interface EventAnnotationListingProviderProps
  extends Pick<ContentListClientProviderProps, 'core' | 'onFetchSuccess'> {
  canDelete: boolean;
  canSave: boolean;
  children?: ReactNode;
  dataViewFilter: DataViewFilterDefinition;
  dataViewSort: DataViewSortField;
  eventAnnotationService: EventAnnotationServiceType;
  onEditGroup: ({ group, id }: { group: EventAnnotationGroupConfig; id: string }) => void;
  savedObjectsTagging: SavedObjectsTaggingApi;
  /**
   * Bump to force a full `ContentListClientProvider` remount via `key`. `refreshSignal` is reserved for `GroupEditorFlyout` saves, where
   * we want to drop the entire client cache so the next render refetches
   * with a fresh React Query state.
   */
  refreshSignal: number;
}

export const EventAnnotationListingProvider = ({
  canDelete,
  canSave,
  children,
  core,
  dataViewFilter,
  dataViewSort,
  eventAnnotationService,
  onEditGroup,
  onFetchSuccess,
  refreshSignal,
  savedObjectsTagging,
}: EventAnnotationListingProviderProps) => {
  const findItems: TableListViewFindItemsFn = useCallback(
    async (searchTerm, options, signal) => {
      // Fast-fail if the request was already aborted (e.g. by a fresh search
      // superseding this one) — saves a wasted HTTP round trip. The strategy
      // re-checks `signal.aborted` after we resolve, so a late abort is also
      // honoured. We can't forward `signal` to `client.search()` itself
      // because the Content Management/Saved Objects client doesn't expose
      // an `AbortSignal` surface.
      if (signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }
      const { references, referencesToExclude, listingLimit } = options ?? {};
      return eventAnnotationService.findAnnotationGroupContent(
        searchTerm,
        listingLimit,
        references?.map(({ id }) => id),
        referencesToExclude?.map(({ id }) => id)
      );
    },
    [eventAnnotationService]
  );

  const onEdit = useCallback(
    async ({ id }: ContentListItem) => {
      if (!canSave) {
        return;
      }
      const group = await eventAnnotationService.loadAnnotationGroup(id);
      onEditGroup({ group, id });
    },
    [canSave, eventAnnotationService, onEditGroup]
  );

  const onDelete = useCallback(
    async (items: ContentListItem[]) => {
      await eventAnnotationService.deleteAnnotationGroups(items.map(({ id }) => id));
    },
    [eventAnnotationService]
  );

  const isReadOnly = !canSave && !canDelete;

  const item = useMemo(
    () => ({
      actions: {
        ...(canSave && { edit: { onItemAction: onEdit } }),
        ...(canDelete && { delete: { onBulkAction: onDelete } }),
      },
    }),
    [canSave, canDelete, onEdit, onDelete]
  );

  const tagsService = useMemo(
    () => createTagsService(savedObjectsTagging.ui),
    [savedObjectsTagging]
  );

  const services = useMemo<ContentListClientServices>(
    () => ({ tags: tagsService, savedObjectsTagging }),
    [tagsService, savedObjectsTagging]
  );

  const features = useMemo<ContentListClientFeatures>(
    () => ({
      sorting: {
        initialSort: { field: 'updatedAt', direction: 'desc' },
        fields: (defaults) => ({ ...defaults, dataView: dataViewSort }),
      },
      pagination: true,
      selection: canDelete,
      filters: {
        dataView: dataViewFilter,
      },
    }),
    [canDelete, dataViewFilter, dataViewSort]
  );

  return (
    <RootDragDropProvider>
      <ContentListClientProvider
        id="eventAnnotation"
        key={refreshSignal}
        {...{
          core,
          features,
          findItems,
          isReadOnly,
          item,
          labels,
          onFetchSuccess,
          services,
        }}
      >
        {children}
      </ContentListClientProvider>
    </RootDragDropProvider>
  );
};
