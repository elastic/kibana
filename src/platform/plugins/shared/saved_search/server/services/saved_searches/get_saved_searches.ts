/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
import { fromDiscoverSessionAttributesToSavedSearch } from '../../../common/service/saved_searches_utils';
import type { DiscoverSessionAttributes } from '../../saved_objects';

interface GetSavedSearchDependencies {
  savedObjects: SavedObjectsClientContract;
  searchSourceStart: ISearchStartSearchSource;
}

export const getSavedSearch = async (savedSearchId: string, deps: GetSavedSearchDependencies) => {
  const discoverSession = await deps.savedObjects.get<DiscoverSessionAttributes>(
    'search',
    savedSearchId
  );

  const [{ attributes }] = discoverSession.attributes.tabs;
  const parsedSearchSourceJSON = parseSearchSourceJSON(
    attributes.kibanaSavedObjectMeta?.searchSourceJSON ?? '{}'
  );

  const searchSourceValues = injectReferences(
    parsedSearchSourceJSON as Parameters<typeof injectReferences>[0],
    discoverSession.references
  );

  return fromDiscoverSessionAttributesToSavedSearch(
    savedSearchId,
    discoverSession.attributes,
    undefined,
    await deps.searchSourceStart.create(searchSourceValues),
    Boolean(discoverSession.managed)
  );
};
