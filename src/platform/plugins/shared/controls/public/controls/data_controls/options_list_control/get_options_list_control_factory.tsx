/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  buildExistsFilter,
  buildPhraseFilter,
  buildPhrasesFilter,
  type Filter,
} from '@kbn/es-query';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import {
  initializeTitleManager,
  titleComparators,
  type PublishingSubject,
} from '@kbn/presentation-publishing';
import React, { useEffect } from 'react';
import {
  BehaviorSubject,
  Subject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  merge,
  skip,
} from 'rxjs';
import type {
  OptionsListControlState,
  OptionsListSortingType,
  OptionsListSuccessResponse,
} from '../../../../common/options_list';
import { getSelectionAsFieldType, isValidSearch } from '../../../../common/options_list';
import { coreServices } from '../../../services/kibana_services';
import {
  defaultDataControlComparators,
  initializeDataControlManager,
} from '../data_control_manager';
import { OptionsListControl } from './components/options_list_control';
import {
  DEFAULT_SEARCH_TECHNIQUE,
  MIN_OPTIONS_LIST_REQUEST_SIZE,
  OPTIONS_LIST_DEFAULT_SORT,
} from './constants';
import { editorComparators, initializeEditorStateManager } from './editor_state_manager';
import { fetchAndValidate$ } from './fetch_and_validate';
import { OptionsListControlContext } from './options_list_context_provider';
import { OptionsListStrings } from './options_list_strings';
import { initializeSelectionsManager, selectionComparators } from './selections_manager';
import { initializeTemporayStateManager } from './temporay_state_manager';
import type { OptionsListComponentApi, OptionsListControlApi } from './types';
import { buildFilter } from './utils';
import { deselectAll, deselectOption, makeSelection, selectAll } from './utils/selection_utils';

export const getOptionsListControlFactory = (): EmbeddableFactory<
  OptionsListControlState,
  OptionsListControlApi
> => {
  return {
    type: OPTIONS_LIST_CONTROL,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const state = initialState.rawState;
      const sort$ = new BehaviorSubject<OptionsListSortingType | undefined>(
        state.sort ?? OPTIONS_LIST_DEFAULT_SORT
      );

      const editorStateManager = initializeEditorStateManager(state);
      const temporaryStateManager = initializeTemporayStateManager();
      const titlesManager = initializeTitleManager(state);
      const selectionsManager = initializeSelectionsManager(state);

      const dataControlManager = await initializeDataControlManager(
        uuid,
        OPTIONS_LIST_CONTROL,
        OptionsListStrings.control.getDisplayName(),
        state,
        parentApi,
        selectionsManager.api.hasInitialSelections,
        (dataView) => buildFilter(dataView, uuid, state)
      );

      const selectionsSubscription = selectionsManager.anyStateChange$.subscribe(
        dataControlManager.internalApi.onSelectionChange
      );

      /** Handle loading state; since suggestion fetching and validation are tied, only need one loading subject */
      const loadingSuggestions$ = new BehaviorSubject<boolean>(false);
      const dataLoadingSubscription = combineLatest([
        loadingSuggestions$,
        dataControlManager.api.dataLoading$,
      ])
        .pipe(
          debounceTime(100), // debounce set loading so that it doesn't flash as the user types
          map((values) => values.some((value) => value))
        )
        .subscribe((isLoading) => {
          temporaryStateManager.api.setDataLoading(isLoading);
        });

      /** Debounce the search string changes to reduce the number of fetch requests */
      const debouncedSearchString = temporaryStateManager.api.searchString$.pipe(debounceTime(100));

      /** Validate the search string as the user types */
      const validSearchStringSubscription = combineLatest([
        debouncedSearchString,
        dataControlManager.api.field$,
        editorStateManager.api.searchTechnique$,
      ]).subscribe(([newSearchString, field, searchTechnique]) => {
        temporaryStateManager.api.setSearchStringValid(
          isValidSearch({
            searchString: newSearchString,
            fieldType: field?.type,
            searchTechnique,
          })
        );
      });

      /** Clear state when the field changes */
      const fieldChangedSubscription = combineLatest([
        dataControlManager.api.fieldName$,
        dataControlManager.api.dataViewId$,
      ])
        .pipe(
          skip(1) // skip first, since this represents initialization
        )
        .subscribe(() => {
          temporaryStateManager.api.setSearchString('');
          selectionsManager.api.setSelectedOptions(undefined);
          selectionsManager.api.setExistsSelected(false);
          selectionsManager.api.setExclude(false);
          temporaryStateManager.api.setRequestSize(MIN_OPTIONS_LIST_REQUEST_SIZE);
          sort$.next(OPTIONS_LIST_DEFAULT_SORT);
        });

      /** Fetch the suggestions and perform validation */
      const suggestionLoadError$ = new BehaviorSubject<Error | undefined>(undefined);
      const loadMoreSubject = new Subject<void>();
      const fetchSubscription = fetchAndValidate$({
        api: {
          ...dataControlManager.api,
          loadMoreSubject,
          loadingSuggestions$,
          debouncedSearchString,
          parentApi,
          uuid,
        },
        requestSize$: temporaryStateManager.api.requestSize$,
        runPastTimeout$: editorStateManager.api.runPastTimeout$,
        selectedOptions$: selectionsManager.api.selectedOptions$,
        searchTechnique$: editorStateManager.api.searchTechnique$,
        sort$,
      }).subscribe((result) => {
        // if there was an error during fetch, set suggestion load error and return early
        if (Object.hasOwn(result, 'error')) {
          suggestionLoadError$.next((result as { error: Error }).error);
          return;
        } else if (suggestionLoadError$.getValue()) {
          // otherwise,  if there was a previous error, clear it
          suggestionLoadError$.next(undefined);
        }

        // fetch was successful so set all attributes from result
        const successResponse = result as OptionsListSuccessResponse;
        temporaryStateManager.api.setAvailableOptions(successResponse.suggestions);
        temporaryStateManager.api.setTotalCardinality(successResponse.totalCardinality ?? 0);
        temporaryStateManager.api.setInvalidSelections(
          new Set(successResponse.invalidSelections ?? [])
        );

        // reset the request size back to the minimum (if it's not already)
        if (temporaryStateManager.api.requestSize$.getValue() !== MIN_OPTIONS_LIST_REQUEST_SIZE) {
          temporaryStateManager.api.setRequestSize(MIN_OPTIONS_LIST_REQUEST_SIZE);
        }
      });

      /** Remove all other selections if this control becomes a single select */
      const singleSelectSubscription = editorStateManager.api.singleSelect$
        .pipe(filter((singleSelect) => Boolean(singleSelect)))
        .subscribe(() => {
          const currentSelections = selectionsManager.api.selectedOptions$.getValue() ?? [];
          if (currentSelections.length > 1)
            selectionsManager.api.setSelectedOptions([currentSelections[0]]);
        });

      const hasSelections$ = new BehaviorSubject<boolean>(
        Boolean(state.selectedOptions?.length || state.existsSelected)
      );
      const hasSelectionsSubscription = combineLatest([
        selectionsManager.api.selectedOptions$,
        selectionsManager.api.existsSelected$,
      ])
        .pipe(
          map(([selectedOptions, existsSelected]) => {
            return Boolean(selectedOptions?.length || existsSelected);
          }),
          distinctUntilChanged()
        )
        .subscribe((hasSelections) => {
          hasSelections$.next(hasSelections);
        });

      /** Output filters when selections change */
      const outputFilterSubscription = combineLatest([
        dataControlManager.api.dataViews$,
        dataControlManager.api.fieldName$,
        selectionsManager.api.selectedOptions$,
        selectionsManager.api.existsSelected$,
        selectionsManager.api.exclude$,
      ])
        .pipe(debounceTime(0))
        .subscribe(([dataViews, fieldName, selectedOptions, existsSelected, exclude]) => {
          const dataView = dataViews?.[0];
          let newFilter: Filter | undefined;
          if (dataView) {
            newFilter = buildFilter(dataView, uuid, {
              fieldName,
              selectedOptions,
              existsSelected,
              exclude,
            });
          }
          dataControlManager.internalApi.setOutputFilter(newFilter);
        });

      const { placeholder, hideActionBar, hideExclude, hideExists, hideSort } = state;

      function serializeState() {
        return {
          rawState: {
            ...dataControlManager.getLatestState(),
            ...selectionsManager.getLatestState(),
            ...editorStateManager.getLatestState(),
            ...titlesManager.getLatestState(),
            sort: sort$.getValue(),

            // serialize state that cannot be changed to keep it consistent
            placeholder,
            hideActionBar,
            hideExclude,
            hideExists,
            hideSort,
          },
          references: dataControlManager.internalApi.extractReferences('optionsListDataView'),
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<OptionsListControlState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(
          dataControlManager.anyStateChange$,
          selectionsManager.anyStateChange$,
          editorStateManager.anyStateChange$,
          titlesManager.anyStateChange$,
          sort$
        ).pipe(map(() => undefined)),
        getComparators: () => {
          return {
            ...titleComparators,
            ...defaultDataControlComparators,
            ...selectionComparators,
            ...editorComparators,
            sort: 'deepEquality',
            // This state cannot currently be changed after the control is created
            placeholder: 'skip',
            hideActionBar: 'skip',
            hideExclude: 'skip',
            hideExists: 'skip',
            hideSort: 'skip',
          };
        },
        defaultState: {
          searchTechnique: DEFAULT_SEARCH_TECHNIQUE,
          sort: OPTIONS_LIST_DEFAULT_SORT,
          exclude: false,
          existsSelected: false,
        },
        onReset: (lastSaved) => {
          dataControlManager.reinitializeState(lastSaved?.rawState);
          selectionsManager.reinitializeState(lastSaved?.rawState);
          editorStateManager.reinitializeState(lastSaved?.rawState);
          sort$.next(lastSaved?.rawState.sort ?? OPTIONS_LIST_DEFAULT_SORT);
        },
      });

      const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
      const errorsSubscription = combineLatest([
        dataControlManager.api.blockingError$,
        suggestionLoadError$,
      ])
        .pipe(
          map(([controlError, suggestionError]) => {
            return controlError ?? suggestionError;
          })
        )
        .subscribe((error) => blockingError$.next(error));

      const api = finalizeApi({
        ...unsavedChangesApi,
        ...dataControlManager.api,
        ...titlesManager.api,
        blockingError$,
        dataLoading$: temporaryStateManager.api.dataLoading$,
        getTypeDisplayName: OptionsListStrings.control.getDisplayName,
        serializeState,
        clearSelections: () => {
          if (selectionsManager.api.selectedOptions$.getValue()?.length)
            selectionsManager.api.setSelectedOptions([]);
          if (selectionsManager.api.existsSelected$.getValue())
            selectionsManager.api.setExistsSelected(false);
          if (temporaryStateManager.api.invalidSelections$.getValue().size)
            temporaryStateManager.api.setInvalidSelections(new Set([]));
        },
        hasSelections$: hasSelections$ as PublishingSubject<boolean | undefined>,
        setSelectedOptions: selectionsManager.api.setSelectedOptions,
      });

      // we do not want to delay the embeddable creation waiting for this, so do not await promise
      const allowExpensiveQueries$ = new BehaviorSubject<boolean>(true);
      coreServices.http
        .get<{
          allowExpensiveQueries: boolean;
        }>('/internal/controls/getExpensiveQueriesSetting', {
          version: '1',
        })
        .catch(() => {
          return { allowExpensiveQueries: true }; // default to true on error
        })
        .then(({ allowExpensiveQueries }) => {
          if (!allowExpensiveQueries) allowExpensiveQueries$.next(false);
        });

      const componentApi: OptionsListComponentApi = {
        ...api,
        ...dataControlManager.api,
        ...editorStateManager.api,
        ...selectionsManager.api,
        ...temporaryStateManager.api,
        ...titlesManager.api,
        loadMoreSubject,
        deselectOption: (key) =>
          deselectOption({ api, selectionsManager, temporaryStateManager, key }),
        makeSelection: (key: string | undefined, showOnlySelected: boolean) =>
          makeSelection({
            api,
            selectionsManager,
            temporaryStateManager,
            editorStateManager,
            key,
            showOnlySelected,
          }),
        sort$,
        setSort: (sort: OptionsListSortingType | undefined) => {
          sort$.next(sort);
        },
        selectAll: (keys: string[]) => selectAll({ api, keys, selectionsManager }),
        deselectAll: (keys: string[]) => deselectAll({ api, keys, selectionsManager }),
        allowExpensiveQueries$,
      };

      return {
        api,
        Component: () => {
          useEffect(() => {
            return () => {
              // on unmount, clean up all subscriptions
              dataLoadingSubscription.unsubscribe();
              fetchSubscription.unsubscribe();
              fieldChangedSubscription.unsubscribe();
              outputFilterSubscription.unsubscribe();
              singleSelectSubscription.unsubscribe();
              validSearchStringSubscription.unsubscribe();
              hasSelectionsSubscription.unsubscribe();
              selectionsSubscription.unsubscribe();
              errorsSubscription.unsubscribe();
            };
          }, []);

          return (
            <OptionsListControlContext.Provider
              value={{
                componentApi,
                displaySettings: { placeholder, hideActionBar, hideExclude, hideExists, hideSort },
              }}
            >
              <OptionsListControl />
            </OptionsListControlContext.Provider>
          );
        },
      };
    },
  };
};
