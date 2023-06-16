/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AttributeService, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type {
  SavedSearch,
  SavedSearchByValueAttributes,
} from '@kbn/saved-search-plugin/public/services/saved_searches/types';
import type { SearchByReferenceInput, SearchByValueInput } from './types';
import { SEARCH_EMBEDDABLE_TYPE } from '../../../common';
import type { SavedSearchesServiceDeps } from './saved_searches_service';
import { getSavedSearchSavedObject } from './get_saved_searches';
import { checkForDuplicateTitle } from '.';
import { saveSavedSearchSavedObject } from './save_saved_searches';

export interface SavedSearchUnwrapMetaInfo {
  sharingSavedObjectProps: SavedSearch['sharingSavedObjectProps'];
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
      const { references, ...so } = attributes;
      const id = await saveSavedSearchSavedObject(
        savedObjectId,
        {
          ...so,
          description: so.description ?? '',
        },
        references,
        services.contentManagement
      );

      return { id };
    },
    unwrapMethod: async (savedObjectId: string): Promise<SavedSearchUnwrapResult> => {
      const so = await getSavedSearchSavedObject(savedObjectId, services);

      return {
        attributes: {
          ...so.item.attributes,
          references: so.item.references,
        },
        metaInfo: {
          sharingSavedObjectProps: so.meta,
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
