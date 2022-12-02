/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AttributeService } from '@kbn/embeddable-plugin/public';
import { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public/services/saved_searches/types';
import { injectSearchSourceReferences, parseSearchSourceJSON } from '@kbn/data-plugin/public';
import { SearchByReferenceInput, SearchByValueInput } from './types';
import { SEARCH_EMBEDDABLE_TYPE } from './constants';
import { DiscoverServices } from '../build_services';
import { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import {
  fromSavedSearchAttributes,
  toSavedSearchAttributes,
} from '@kbn/saved-search-plugin/public/services/saved_searches/saved_searches_utils';
import { SavedObjectReference } from '@kbn/core-saved-objects-server';

export interface SavedSearchUnwrapMetaInfo {
  sharingSavedObjectProps: SavedSearch['sharingSavedObjectProps'];
  tags: SavedSearch['tags'];
  searchSource: SavedSearch['searchSource'];
}

export interface SavedSearchUnwrapResult {
  attributes: SavedSearchAttributes;
  metaInfo?: SavedSearchUnwrapMetaInfo;
}

export type SavedSearchAttributeService = AttributeService<
  SavedSearchAttributes,
  SearchByValueInput,
  SearchByReferenceInput,
  SavedSearchUnwrapMetaInfo
>;

export function getSavedSearchAttributeService(
  services: DiscoverServices
): SavedSearchAttributeService {
  return services.embeddable.getAttributeService<
    SavedSearchAttributes,
    SearchByValueInput,
    SearchByReferenceInput,
    SavedSearchUnwrapMetaInfo
  >(SEARCH_EMBEDDABLE_TYPE, {
    saveMethod: async (attributes: SavedSearchAttributes, savedObjectId?: string) => {
      let tags: string[] | undefined;
      let references: SavedObjectReference[] | undefined;
      let sharingSavedObjectProps: SavedSearch['sharingSavedObjectProps'] | undefined;

      if (savedObjectId) {
        const savedSearch = await services.savedSearch.get(savedObjectId);

        tags = savedSearch.tags;
        references = savedSearch.references;
        sharingSavedObjectProps = savedSearch.sharingSavedObjectProps;
      }

      const parsedSearchSourceJSON = parseSearchSourceJSON(
        attributes.kibanaSavedObjectMeta?.searchSourceJSON ?? '{}'
      );

      const searchSourceValues = injectSearchSourceReferences(
        parsedSearchSourceJSON as Parameters<typeof injectSearchSourceReferences>[0],
        []
      );

      const searchSource = await services.data.search.searchSource.create(searchSourceValues);

      const savedSearch = fromSavedSearchAttributes(
        savedObjectId,
        attributes,
        tags,
        references,
        searchSource,
        sharingSavedObjectProps
      );

      const id = await services.savedSearch.save(savedSearch, { isTitleDuplicateConfirmed: true });

      return { id };
    },
    unwrapMethod: async (savedObjectId: string): Promise<SavedSearchUnwrapResult> => {
      const savedSearch = await services.savedSearch.get(savedObjectId);
      const { searchSourceJSON } = savedSearch.searchSource.serialize();

      return {
        attributes: toSavedSearchAttributes(savedSearch, searchSourceJSON),
        metaInfo: {
          sharingSavedObjectProps: savedSearch.sharingSavedObjectProps,
          tags: savedSearch.tags,
          searchSource: savedSearch.searchSource,
        },
      };
    },
    checkForDuplicateTitle: (props: OnSaveProps) => {
      return services.savedSearch.checkForDuplicateTitle(props);
    },
  });
}
