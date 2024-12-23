/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import {
  injectReferences,
  ISearchStartSearchSource,
  parseSearchSourceJSON,
} from '@kbn/data-plugin/common';
import { fromSavedSearchAttributes, SavedSearchAttributes } from '../../../common';

interface GetSavedSearchDependencies {
  savedObjects: SavedObjectsClientContract;
  searchSourceStart: ISearchStartSearchSource;
}

export const getSavedSearch = async (savedSearchId: string, deps: GetSavedSearchDependencies) => {
  const savedSearch: SavedObject<SavedSearchAttributes> = await deps.savedObjects.get(
    'search',
    savedSearchId
  );

  const parsedSearchSourceJSON = parseSearchSourceJSON(
    savedSearch.attributes.kibanaSavedObjectMeta?.searchSourceJSON ?? '{}'
  );

  const searchSourceValues = injectReferences(
    parsedSearchSourceJSON as Parameters<typeof injectReferences>[0],
    savedSearch.references
  );

  return fromSavedSearchAttributes(
    savedSearchId,
    savedSearch.attributes,
    undefined,
    await deps.searchSourceStart.create(searchSourceValues),
    Boolean(savedSearch.managed)
  );
};
