/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFieldText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DefaultEmbeddableApi, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { type ComposableFetchContextFactory } from '@kbn/embeddable-plugin/public/react_embeddable_system/types';
import { buildPhraseFilter, type Filter } from '@kbn/es-query';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import {
  initializeStateManager,
  useStateFromPublishingSubject,
  type ComposableFetchContext,
  type PublishesComposableFetchContext,
  type StateComparators,
  type WithAllKeys,
} from '@kbn/presentation-publishing';
import React, { useEffect } from 'react';
import { BehaviorSubject, Subject, debounceTime, skip, switchMap } from 'rxjs';
import { DIRECT_FILTER_TYPE } from './constants';

const DATA_VIEW_ID = '90943e30-9a47-11e8-b64d-95841ca0b247'; // Hardcoded logs sample data ID
const FIELD_ID = 'machine.os.keyword';

export interface DirectFilterState {
  searchTerm?: string;
}

export interface DirectFilterApi extends DefaultEmbeddableApi, PublishesComposableFetchContext {}
const defaultDirectFilterState: WithAllKeys<DirectFilterState> = { searchTerm: undefined };
const directFilterComparators: StateComparators<DirectFilterState> = {
  searchTerm: 'referenceEquality',
};

const buildDirectFilter = async (
  dataViews: DataViewsPublicPluginStart,
  searchTerm?: string
): Promise<Filter[]> => {
  await new Promise((r) => setTimeout(r, 1000)); // artificially slow down filter creation
  if (!searchTerm) return [];
  const dataView = await dataViews.get(DATA_VIEW_ID);
  const field = dataView.getFieldByName(FIELD_ID);
  if (!field) throw new Error('Field not found!');

  return [buildPhraseFilter(field, searchTerm, dataView)];
};

export const getDirectFilterEmbeddableFactory = (
  dataViews: DataViewsPublicPluginStart
): EmbeddableFactory<DirectFilterState, DirectFilterApi> => {
  return {
    type: DIRECT_FILTER_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const stateManager = initializeStateManager<DirectFilterState>(
        initialState.rawState,
        defaultDirectFilterState,
        directFilterComparators
      );

      const composableFetchContext$ = new Subject<ComposableFetchContext>();
      const fetchContextSubscription = stateManager.anyStateChange$
        .pipe(
          skip(1),
          debounceTime(100),
          switchMap(() => buildDirectFilter(dataViews, stateManager.getLatestState().searchTerm))
        )
        .subscribe((filters) => composableFetchContext$.next({ filters }));

      const serializeState = () => ({ rawState: stateManager.getLatestState() });

      const unsavedChangesApi = initializeUnsavedChanges({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: stateManager.anyStateChange$,
        getComparators: () => directFilterComparators,
        onReset: async (lastSaved) => stateManager.reinitializeState(lastSaved?.rawState),
      });

      const api = finalizeApi({
        serializeState,
        ...unsavedChangesApi,
        composableFetchContext$,
        title$: new BehaviorSubject<string | undefined>('Direct filter on machine.os.keyword'),
      });

      return {
        api,
        Component: () => {
          const searchTerm = useStateFromPublishingSubject(stateManager.api.searchTerm$);

          useEffect(() => {
            return () => {
              fetchContextSubscription.unsubscribe();
            };
          }, []);
          return (
            <div css={css({ paddingLeft: '5px', paddingRight: '5px', width: '100%' })}>
              <EuiFieldText
                fullWidth={true}
                value={searchTerm ?? ''}
                onChange={(event) => stateManager.api.setSearchTerm(event.target.value)}
              />
            </div>
          );
        },
      };
    },
  };
};

export const getDirectFilterComposableFetchContextFactory = (
  dataViews: DataViewsPublicPluginStart
): ComposableFetchContextFactory<DirectFilterState> => {
  return {
    type: DIRECT_FILTER_TYPE,
    buildFetchContext: async (serializedState) => {
      const filters = await buildDirectFilter(dataViews, serializedState.rawState.searchTerm);
      return { filters };
    },
  };
};
