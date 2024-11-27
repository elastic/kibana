/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertToSavedSearch } from '../../../common/service/get_saved_searches';
import { createGetSavedSearchDeps } from './create_get_saved_search_deps';
import type { SavedSearchesServiceDeps } from './saved_searches_service';
import type { SavedSearch, SavedSearchByValueAttributes } from './types';

export interface SavedSearchUnwrapMetaInfo {
  sharingSavedObjectProps: SavedSearch['sharingSavedObjectProps'];
  managed: boolean | undefined;
}

export interface SavedSearchUnwrapResult {
  attributes: SavedSearchByValueAttributes;
  metaInfo?: SavedSearchUnwrapMetaInfo;
}

export const byValueToSavedSearch = async (
  result: SavedSearchUnwrapResult,
  services: SavedSearchesServiceDeps,
  serializable?: boolean
) => {
  const { sharingSavedObjectProps, managed } = result.metaInfo ?? {};

  return await convertToSavedSearch(
    {
      ...splitReferences(result.attributes),
      savedSearchId: undefined,
      sharingSavedObjectProps,
      managed,
    },
    createGetSavedSearchDeps(services),
    serializable
  );
};

const splitReferences = (attributes: SavedSearchByValueAttributes) => {
  const { references, ...attrs } = attributes;

  return {
    references,
    attributes: {
      ...attrs,
      description: attrs.description ?? '',
    },
  };
};
