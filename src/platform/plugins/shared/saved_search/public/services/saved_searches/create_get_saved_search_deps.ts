/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type SavedSearchCrudTypes, SavedSearchType } from '../../../common/content_management';
import type { GetSavedSearchDependencies } from '../../../common/service/get_saved_searches';
import type { SavedSearchesServiceDeps } from './saved_searches_service';

export const createGetSavedSearchDeps = ({
  spaces,
  savedObjectsTaggingOss,
  search,
  contentManagement,
}: SavedSearchesServiceDeps): GetSavedSearchDependencies => ({
  spaces,
  savedObjectsTagging: savedObjectsTaggingOss?.getTaggingApi(),
  searchSourceCreate: search.searchSource.create,
  getSavedSrch: (id: string) => {
    return contentManagement.get<SavedSearchCrudTypes['GetIn'], SavedSearchCrudTypes['GetOut']>({
      contentTypeId: SavedSearchType,
      id,
    });
  },
});
