/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import type { DashboardStartDependencies } from '../../plugin';
import type { DashboardSavedObjectsTaggingService } from './types';

export type SavedObjectsTaggingServiceFactory = KibanaPluginServiceFactory<
  DashboardSavedObjectsTaggingService,
  DashboardStartDependencies
>;
export const savedObjectsTaggingServiceFactory: SavedObjectsTaggingServiceFactory = ({
  startPlugins,
}) => {
  const { savedObjectsTaggingOss } = startPlugins;
  if (!savedObjectsTaggingOss) return { hasApi: false };

  const { getTaggingApi } = savedObjectsTaggingOss;
  const taggingApi = getTaggingApi();
  if (!taggingApi) return { hasApi: false };

  const {
    ui: {
      components,
      parseSearchQuery,
      hasTagDecoration,
      getSearchBarFilter,
      updateTagsReferences,
      getTagIdsFromReferences,
      getTableColumnDefinition,
      getTagList,
    },
  } = taggingApi;

  return {
    hasApi: true,
    components,
    hasTagDecoration,
    parseSearchQuery,
    getSearchBarFilter,
    updateTagsReferences,
    getTagIdsFromReferences,
    getTableColumnDefinition,
    getTagList,
  };
};
