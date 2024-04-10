/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AttributeService } from '@kbn/embeddable-plugin/public';
import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { SavedSearchAttributes } from '../../../common';
import { convertToSavedSearch } from '../../../common/service/get_saved_searches';
import { createGetSavedSearchDeps } from './create_get_saved_search_deps';
import type { SavedSearchesServiceDeps } from './saved_searches_service';
import type {
  SavedSearch,
  SavedSearchByValueAttributes,
  SearchByReferenceInput,
  SearchByValueInput,
} from './types';

export interface SavedSearchUnwrapMetaInfo {
  sharingSavedObjectProps: SavedSearch['sharingSavedObjectProps'];
  managed: boolean | undefined;
}

export interface SavedSearchUnwrapResult {
  attributes: SavedSearchByValueAttributes;
  metaInfo?: SavedSearchUnwrapMetaInfo;
}

export type SavedSearchAttributeService = AttributeService<
  SavedSearchByValueAttributes,
  SearchByValueInput,
  SearchByReferenceInput,
  SavedSearchUnwrapMetaInfo
>;

export const savedObjectToEmbeddableAttributes = (
  savedObject: SavedObjectCommon<SavedSearchAttributes>
) => ({
  ...savedObject.attributes,
  references: savedObject.references,
});

export const toSavedSearch = async (
  id: string | undefined,
  result: SavedSearchUnwrapResult,
  services: SavedSearchesServiceDeps
) => {
  const { sharingSavedObjectProps, managed } = result.metaInfo ?? {};

  return await convertToSavedSearch(
    {
      ...splitReferences(result.attributes),
      savedSearchId: id,
      sharingSavedObjectProps,
      managed,
    },
    createGetSavedSearchDeps(services)
  );
};

export const splitReferences = (attributes: SavedSearchByValueAttributes) => {
  const { references, ...attrs } = attributes;

  return {
    references,
    attributes: {
      ...attrs,
      description: attrs.description ?? '',
    },
  };
};
