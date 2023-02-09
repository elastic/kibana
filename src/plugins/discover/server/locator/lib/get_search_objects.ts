/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  injectReferences,
  parseSearchSourceJSON,
  SerializedSearchSourceFields,
} from '@kbn/data-plugin/common';
import { DeepPartial } from '@kbn/utility-types';
import { LocatorServicesDeps, SavedSearchObjectType } from '..';
import { DiscoverAppLocatorParams } from '../../../common';

// Correction for return type of non-generic parseSearchSourceJSON
type ParsedSearchSourceJSON = SerializedSearchSourceFields & { indexRefName?: string };

function isSavedSearchObject(
  savedSearch: SavedSearchObjectType | unknown
): savedSearch is SavedSearchObjectType {
  return (
    (savedSearch as DeepPartial<SavedSearchObjectType> | undefined)?.attributes
      ?.kibanaSavedObjectMeta?.searchSourceJSON != null
  );
}

/**
 * Retrieves saved search and searchSource object from discover locator params
 * NOTE: This only supports discover content with SavedSearchObjectType. DataView-only is not supported.
 * @internal
 */
export const getSearchObjects = async (
  services: LocatorServicesDeps,
  params: DiscoverAppLocatorParams
) => {
  // Get the Saved Search object from ID
  const { savedSearchId } = params;
  if (!savedSearchId) {
    throw new Error(`Saved Search ID is needed!`);
  }
  const savedSearch: SavedSearchObjectType = await services.savedObjects.get(
    'search',
    savedSearchId
  );
  if (!isSavedSearchObject(savedSearch)) {
    throw new Error(`Saved search object is not valid`);
  }

  const searchSourceFields: ParsedSearchSourceJSON = parseSearchSourceJSON(
    savedSearch.attributes.kibanaSavedObjectMeta.searchSourceJSON
  );

  const indexRefName = searchSourceFields.indexRefName;
  if (!indexRefName) {
    throw new Error(`Saved Search data is missing a reference to an Index Pattern!`);
  }

  // Get Saved Search Fields with references
  const searchSourceFieldsWithRefs = injectReferences(
    { ...searchSourceFields, indexRefName },
    savedSearch.references ?? []
  );
  const searchSource = await services.searchSourceStart.create(searchSourceFieldsWithRefs);

  return { savedSearch, searchSource };
};
