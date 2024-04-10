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

import { SerializedPanelState } from '@kbn/presentation-containers';
import { extract, inject } from '../../common/embeddable';
import { DiscoverServices } from '../build_services';
import { initializeSearchEmbeddableApi } from './initialize_search_embeddable_api';
import { SearchEmbeddableApi, SearchEmbeddableSerializedState } from './types';

export const getSearchEmbeddableFactory = ({ services }: { services: DiscoverServices }) => {
  const imageEmbeddableFactory: ReactEmbeddableFactory<
    SearchEmbeddableSerializedState,
    SearchEmbeddableApi
  > = {
    type: SEARCH_EMBEDDABLE_TYPE,
    deserializeState: (state) => {
      if (!state.rawState) return {};
      const serializedState = state.rawState as EmbeddableStateWithType;
      const deserializedState = inject(serializedState, state.references ?? []);
      console.log('deserializeState', deserializedState);

      return deserializedState;
    },
    buildEmbeddable: async (initialState, buildApi, uuid) => {
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(initialState);
      const attributeService = services.savedSearch.byValue.attributeService;

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const { searchEmbeddableApi, searchEmbeddableComparators, serializeSearchEmbeddable } =
        await initializeSearchEmbeddableApi(initialState, attributeService);

      const serializeState = (): SerializedPanelState<SearchEmbeddableSerializedState> => {
        const { state: rawState, references } = extract({
          type: SEARCH_EMBEDDABLE_TYPE,
          ...serializeTitles(),
          ...serializeSearchEmbeddable(),
        } as unknown as EmbeddableStateWithType);
        return {
          rawState: rawState as unknown as SearchEmbeddableSerializedState,
          references,
        };
      };

      const embeddable = buildApi(
        {
          ...titlesApi,
          dataLoading: dataLoading$,
          getSavedSearch: () => {
            return undefined;
          },
          canLinkToLibrary: async () => {
            // const { visualize } = coreServices.application.capabilities;
            return !Boolean(searchEmbeddableApi.savedObjectId$.getValue());
          },
          canUnlinkFromLibrary: async () => Boolean(searchEmbeddableApi.savedObjectId$.getValue()),
          saveToLibrary: async (title: string) => {
            // @ts-ignore Fix this later
            const savedObjectId = await attributeService.saveMethod({
              title,
              ...searchEmbeddableApi.attributes$.getValue(),
            });
            return savedObjectId;
          },
          getByReferenceState: (savedObjectId: string) => {
            return {
              savedObjectId,
            };
          },
          // @ts-ignore Fix this later
          checkForDuplicateTitle: attributeService.checkForDuplicateTitle,
          getByValueState: () => {
            const { savedObjectId, ...byValueState } = serializeState().rawState ?? {};
            return {
              ...byValueState,
              attributes: searchEmbeddableApi.attributes$.getValue(),
            };
          },
          serializeState,
        },
        {
          ...titleComparators,
          ...searchEmbeddableComparators,
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
