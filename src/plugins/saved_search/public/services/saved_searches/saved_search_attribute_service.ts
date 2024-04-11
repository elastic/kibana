/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { OnSaveProps } from '@kbn/saved-objects-plugin/public';

import { SavedSearchAttributes } from '../../../common';
import {
  convertToSavedSearch,
  getSearchSavedObject,
} from '../../../common/service/get_saved_searches';
import { checkForDuplicateTitle } from './check_for_duplicate_title';
import { createGetSavedSearchDeps } from './create_get_saved_search_deps';
import type { SavedSearchesServiceDeps } from './saved_searches_service';
import { saveSearchSavedObject } from './save_saved_searches';
import type { SavedSearch, SavedSearchByValueAttributes } from './types';

export interface SavedSearchUnwrapMetaInfo {
  sharingSavedObjectProps: SavedSearch['sharingSavedObjectProps'];
  managed: boolean | undefined;
}

export interface SavedSearchUnwrapResult {
  attributes: SavedSearchByValueAttributes;
  metaInfo?: SavedSearchUnwrapMetaInfo;
}

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

export interface SavedSearchAttributeService {
  saveMethod: (attributes: SavedSearchByValueAttributes, savedObjectId?: string) => Promise<string>;
  unwrapMethod: (savedObjectId: string) => Promise<SavedSearchUnwrapResult>;
  checkForDuplicateTitle: (
    props: Pick<OnSaveProps, 'newTitle' | 'isTitleDuplicateConfirmed' | 'onTitleDuplicate'>
  ) => Promise<void>;
}

export const getSavedSearchAttributeService = (
  deps: SavedSearchesServiceDeps
): SavedSearchAttributeService => ({
  saveMethod: async (
    attributes: SavedSearchByValueAttributes,
    savedObjectId?: string
  ): Promise<string> => {
    const { references, attributes: attrs } = splitReferences(attributes);
    const id = await saveSearchSavedObject(
      savedObjectId,
      attrs,
      references,
      deps.contentManagement
    );
    return id;
  },
  unwrapMethod: async (savedObjectId: string): Promise<SavedSearchUnwrapResult> => {
    const so = await getSearchSavedObject(savedObjectId, createGetSavedSearchDeps(deps));

    return {
      attributes: savedObjectToEmbeddableAttributes(so.item),
      metaInfo: {
        sharingSavedObjectProps: so.meta,
        managed: so.item.managed,
      },
    };
  },
  checkForDuplicateTitle: (
    props: Pick<OnSaveProps, 'newTitle' | 'isTitleDuplicateConfirmed' | 'onTitleDuplicate'>
  ) => {
    return checkForDuplicateTitle({
      title: props.newTitle,
      isTitleDuplicateConfirmed: props.isTitleDuplicateConfirmed,
      onTitleDuplicate: props.onTitleDuplicate,
      contentManagement: deps.contentManagement,
    });
  },
});
