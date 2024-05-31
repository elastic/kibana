/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AttributeService, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { SavedSearchAttributes } from '../../../common';
import type {
  SavedSearch,
  SavedSearchByValueAttributes,
  SearchByReferenceInput,
  SearchByValueInput,
} from './types';
import type { SavedSearchesServiceDeps } from './saved_searches_service';
import {
  getSearchSavedObject,
  convertToSavedSearch,
} from '../../../common/service/get_saved_searches';
import { checkForDuplicateTitle } from './check_for_duplicate_title';
import { saveSearchSavedObject } from './save_saved_searches';
import { createGetSavedSearchDeps } from './create_get_saved_search_deps';

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

export function getSavedSearchAttributeService(
  services: SavedSearchesServiceDeps & {
    embeddable: EmbeddableStart;
  }
): SavedSearchAttributeService {
  return services.embeddable.getAttributeService<
    SavedSearchByValueAttributes,
    SearchByValueInput,
    SearchByReferenceInput,
    SavedSearchUnwrapMetaInfo
  >(SEARCH_EMBEDDABLE_TYPE, {
    saveMethod: async (attributes: SavedSearchByValueAttributes, savedObjectId?: string) => {
      const { references, attributes: attrs } = splitReferences(attributes);
      const id = await saveSearchSavedObject(
        savedObjectId,
        attrs,
        references,
        services.contentManagement
      );

      return { id };
    },
    unwrapMethod: async (savedObjectId: string): Promise<SavedSearchUnwrapResult> => {
      const so = await getSearchSavedObject(savedObjectId, createGetSavedSearchDeps(services));

      return {
        attributes: savedObjectToEmbeddableAttributes(so.item),
        metaInfo: {
          sharingSavedObjectProps: so.meta,
          managed: so.item.managed,
        },
      };
    },
    checkForDuplicateTitle: (props: OnSaveProps) => {
      return checkForDuplicateTitle({
        title: props.newTitle,
        isTitleDuplicateConfirmed: props.isTitleDuplicateConfirmed,
        onTitleDuplicate: props.onTitleDuplicate,
        contentManagement: services.contentManagement,
      });
    },
  });
}

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
