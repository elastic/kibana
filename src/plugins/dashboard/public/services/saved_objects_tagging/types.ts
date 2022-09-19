/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';

export interface DashboardSavedObjectsTaggingService {
  hasApi: boolean; // remove this once the entire service is optional

  components?: SavedObjectsTaggingApi['ui']['components'];
  getSearchBarFilter?: SavedObjectsTaggingApi['ui']['getSearchBarFilter'];
  getTableColumnDefinition?: SavedObjectsTaggingApi['ui']['getTableColumnDefinition'];
  hasTagDecoration?: SavedObjectsTaggingApi['ui']['hasTagDecoration'];
  parseSearchQuery?: SavedObjectsTaggingApi['ui']['parseSearchQuery'];
}
