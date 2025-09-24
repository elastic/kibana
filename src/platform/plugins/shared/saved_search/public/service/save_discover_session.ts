/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { Reference } from '@kbn/content-management-utils';
import { extractReferences } from '@kbn/data-plugin/common';
import type { SavedObjectReference } from '@kbn/core/server';
import type { DiscoverSessionAttributes } from '../../server/saved_objects';
import type { DiscoverSessionTab } from '../../server';
import { SAVED_SEARCH_TYPE } from './constants';
import type { SavedSearchCrudTypes } from '../../common/content_management';
import { checkForDuplicateTitle } from './check_for_duplicate_title';
import type { DiscoverSession } from '../../common';

export type SaveDiscoverSessionParams = Pick<
  DiscoverSession,
  'title' | 'description' | 'tabs' | 'tags'
> &
  Partial<Pick<DiscoverSession, 'id'>>;

export interface SaveDiscoverSessionOptions {
  onTitleDuplicate?: () => void;
  isTitleDuplicateConfirmed?: boolean;
  copyOnSave?: boolean;
}

const saveDiscoverSessionSavedObject = async (
  id: string | undefined,
  attributes: DiscoverSessionAttributes,
  references: Reference[] | undefined,
  contentManagement: ContentManagementPublicStart['client']
) => {
  const resp = id
    ? await contentManagement.update<
        SavedSearchCrudTypes['UpdateIn'],
        SavedSearchCrudTypes['UpdateOut']
      >({
        contentTypeId: SAVED_SEARCH_TYPE,
        id,
        data: attributes,
        options: {
          references,
        },
      })
    : await contentManagement.create<
        SavedSearchCrudTypes['CreateIn'],
        SavedSearchCrudTypes['CreateOut']
      >({
        contentTypeId: SAVED_SEARCH_TYPE,
        data: attributes,
        options: {
          references,
        },
      });

  return resp.item.id;
};

export const saveDiscoverSession = async (
  discoverSession: SaveDiscoverSessionParams,
  options: SaveDiscoverSessionOptions,
  contentManagement: ContentManagementPublicStart['client'],
  savedObjectsTagging: SavedObjectsTaggingApi | undefined
): Promise<DiscoverSession | undefined> => {
  const isNew = options.copyOnSave || !discoverSession.id;

  if (isNew) {
    try {
      await checkForDuplicateTitle({
        title: discoverSession.title,
        isTitleDuplicateConfirmed: options.isTitleDuplicateConfirmed,
        onTitleDuplicate: options.onTitleDuplicate,
        contentManagement,
      });
    } catch {
      return;
    }
  }

  const tabReferences: SavedObjectReference[] = [];

  const tabs: DiscoverSessionTab[] = discoverSession.tabs.map((tab) => {
    const [serializedSearchSource, searchSourceReferences] = extractReferences(
      tab.serializedSearchSource,
      { refNamePrefix: `tab_${tab.id}` }
    );

    tabReferences.push(...searchSourceReferences);

    return {
      id: tab.id,
      label: tab.label,
      attributes: {
        sort: tab.sort,
        columns: tab.columns,
        grid: tab.grid,
        hideChart: tab.hideChart,
        isTextBasedQuery: tab.isTextBasedQuery,
        usesAdHocDataView: tab.usesAdHocDataView,
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify(serializedSearchSource),
        },
        viewMode: tab.viewMode,
        hideAggregatedPreview: tab.hideAggregatedPreview,
        rowHeight: tab.rowHeight,
        headerRowHeight: tab.headerRowHeight,
        timeRestore: tab.timeRestore,
        timeRange: tab.timeRange,
        refreshInterval: tab.refreshInterval,
        rowsPerPage: tab.rowsPerPage,
        sampleSize: tab.sampleSize,
        breakdownField: tab.breakdownField,
        density: tab.density,
        visContext: tab.visContext,
        controlGroupJson: tab.controlGroupJson,
      },
    };
  });

  const attributes: DiscoverSessionAttributes = {
    title: discoverSession.title,
    description: discoverSession.description,
    tabs,
  };

  const references = savedObjectsTagging
    ? savedObjectsTagging.ui.updateTagsReferences(tabReferences, discoverSession.tags ?? [])
    : tabReferences;

  const id = await saveDiscoverSessionSavedObject(
    isNew ? undefined : discoverSession.id,
    attributes,
    references,
    contentManagement
  );

  return { ...discoverSession, id, references, managed: false };
};
