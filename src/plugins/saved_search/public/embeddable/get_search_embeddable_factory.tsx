/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { initializeTitles } from '@kbn/presentation-publishing';
import { createGetSavedSearchDeps } from '../services/saved_searches/create_get_saved_search_deps';
import { savedObjectToEmbeddableAttributes } from '../services/saved_searches/saved_search_attribute_service';
import { SearchEmbeddableApi, SearchEmbeddableSerializedState } from './types';
import { getSearchSavedObject } from '../../common/service/get_saved_searches';
import { SavedSearchByValueAttributes, SearchByReferenceInput, SearchByValueInput } from '..';
import { SavedSearchesServiceDeps } from '../services/saved_searches/saved_searches_service';

export const getSearchEmbeddableFactory = ({
  services,
}: {
  services: SavedSearchesServiceDeps;
}) => {
  console.log('here 2');
  const imageEmbeddableFactory: ReactEmbeddableFactory<
    SearchByReferenceInput | SearchByValueInput,
    SearchEmbeddableApi
  > = {
    type: SEARCH_EMBEDDABLE_TYPE,
    deserializeState: (state) => {
      console.log('deserializeState', state);
      return state.rawState as SearchByReferenceInput | SearchByValueInput;
      // const serializedState = cloneDeep(state.rawState);
      // return inject(serializedState, state.references ?? []) as SearchEmbeddableSerializedState;
    },
    buildEmbeddable: async (initialState, buildApi, uuid) => {
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const savedObjectId$ = new BehaviorSubject<string | undefined>(
        (initialState as SearchByReferenceInput)?.savedObjectId
      );
      const attributes$ = new BehaviorSubject<SavedSearchByValueAttributes | undefined>(
        (initialState as SearchByValueInput)?.attributes
      );

      attributes$.subscribe((attributes) => {
        console.log('ATTRIBUTES', attributes);
      });

      if ((initialState as SearchByReferenceInput)?.savedObjectId) {
        const so = await getSearchSavedObject(
          (initialState as SearchByReferenceInput).savedObjectId,
          createGetSavedSearchDeps(services)
        );
        attributes$.next(savedObjectToEmbeddableAttributes(so.item));
      }

      const embeddable = buildApi(
        {
          ...titlesApi,
          dataLoading: dataLoading$,
          getSavedSearch: () => {
            return undefined;
          },
          canLinkToLibrary: async () => !Boolean(savedObjectId$.getValue()),
          canUnlinkFromLibrary: async () => Boolean(savedObjectId$.getValue()),
          saveToLibrary: async () => {
            return '';
          },
          getByReferenceState: (savedObjectId: string) => {
            console.log('get by reference state', savedObjectId);
            // return {
            //   ..._.omit(this.getExplicitInput(), 'attributes'),
            //   savedObjectId: libraryId,
            // };
            return {};
          },
          checkForDuplicateTitle: async () => {},
          getByValueState: () => {
            console.log('get by value state');
            return {};
          },
          serializeState: () => {
            console.log('attributes$.getValue()', attributes$.getValue());
            return {
              rawState: {
                ...serializeTitles(),
                attributes: attributes$.getValue(),
              } as SearchEmbeddableSerializedState,
            };
          },
        },
        {
          ...titleComparators,
        }
      );
      return {
        api: embeddable,
        Component: () => {
          return <>Here</>;
        },
      };
    },
  };

  return imageEmbeddableFactory;
};
