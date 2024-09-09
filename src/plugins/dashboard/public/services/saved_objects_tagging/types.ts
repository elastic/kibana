/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';

export interface DashboardSavedObjectsTaggingService {
  hasApi: boolean; // remove this once the entire service is optional
  api?: SavedObjectsTaggingApi;
  components?: SavedObjectsTaggingApi['ui']['components'];
  hasTagDecoration?: SavedObjectsTaggingApi['ui']['hasTagDecoration'];
  parseSearchQuery?: SavedObjectsTaggingApi['ui']['parseSearchQuery'];
  getSearchBarFilter?: SavedObjectsTaggingApi['ui']['getSearchBarFilter'];
  updateTagsReferences?: SavedObjectsTaggingApi['ui']['updateTagsReferences'];
  getTagIdsFromReferences?: SavedObjectsTaggingApi['ui']['getTagIdsFromReferences'];
  getTableColumnDefinition?: SavedObjectsTaggingApi['ui']['getTableColumnDefinition'];
  getTagList?: SavedObjectsTaggingApi['ui']['getTagList'];
}
