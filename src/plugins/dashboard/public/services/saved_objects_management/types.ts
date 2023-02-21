/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Query } from '@elastic/eui';
import { SavedObjectManagementTypeInfo } from '@kbn/saved-objects-management-plugin/common';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { SavedObjectsFindOptionsReference } from '@kbn/core-saved-objects-api-server';

export interface DashboardSavedObjectsManagementService {
  parseQuery: (
    query: Query,
    types: SavedObjectManagementTypeInfo[]
  ) => { queryText?: string; visibleTypes?: string[]; selectedTags?: string[] };

  getTagFindReferences: ({
    selectedTags,
    taggingApi,
  }: {
    selectedTags?: string[];
    taggingApi?: SavedObjectsTaggingApi;
  }) => SavedObjectsFindOptionsReference[] | undefined;
}
