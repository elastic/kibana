/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  merge,
  skip,
  Subject,
} from 'rxjs';

import { buildExistsFilter, buildPhraseFilter, buildPhrasesFilter, Filter } from '@kbn/es-query';
import { PublishingSubject } from '@kbn/presentation-publishing';

import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { OPTIONS_LIST_CONTROL } from '../../../../common';
import type {
  OptionsListControlState,
  OptionsListSortingType,
  OptionsListSuccessResponse,
} from '../../../../common/options_list';
import { getSelectionAsFieldType, isValidSearch } from '../../../../common/options_list';
import {
  defaultDataControlComparators,
  initializeDataControlManager,
} from '../data_control_manager';
import type { DataControlFactory } from '../types';
import { OptionsListControl } from './components/options_list_control';
import { OptionsListEditorOptions } from './components/options_list_editor_options';
import {
  DEFAULT_SEARCH_TECHNIQUE,
  MIN_OPTIONS_LIST_REQUEST_SIZE,
  OPTIONS_LIST_DEFAULT_SORT,
} from './constants';
import { fetchAndValidate$ } from './fetch_and_validate';
import { OptionsListControlContext } from './options_list_context_provider';
import { initializeSelectionsManager, selectionComparators } from './selections_manager';
import { OptionsListStrings } from './options_list_strings';
import type { OptionsListComponentApi, OptionsListControlApi } from './types';
import { initializeTemporayStateManager } from './temporay_state_manager';
import {
  editorComparators,
  EditorState,
  initializeEditorStateManager,
} from './editor_state_manager';

export const getOptionsListControlFactory = (): DataControlFactory<
  OptionsListControlState,
  OptionsListControlApi
> => {
  return {
    type: OPTIONS_LIST_CONTROL,
    order: 3, // should always be first, since this is the most popular control
    getIconType: () => 'editorChecklist',
    getDisplayName: OptionsListStrings.control.getDisplayName,
    isFieldCompatible: (field) => {
      return (
        !field.spec.scripted &&
        field.aggregatable &&
        ['string', 'boolean', 'ip', 'date', 'number'].includes(field.type)
      );
    },
    CustomOptionsComponent: OptionsListEditorOptions,
    buildControl: async ({ initialState, finalizeApi, uuid, controlGroupApi }) => {
      /** Serializable state - i.e. the state that is saved with the control */
      const editorStateManager = initializeEditorStateManager(initialState);

      const sort$ = new BehaviorSubject<OptionsListSortingType | undefined>(
        initialState.sort ?? OPTIONS_LIST_DEFAULT_SORT
      );

      const placeholder = initialState.placeholder;
      const hideActionBar = initialState.hideActionBar;
      const hideExclude = initialState.hideExclude;
      const hideExists = initialState.hideExists;
      const hideSort = initialState.hideSort;

      const temporaryStateManager = initializeTemporayStateManager();

      const dataControlManager = initializeDataControlManager<EditorState>(
        uuid,
        OPTIONS_LIST_CONTROL,
        initialState,
        editorStateManager.getLatestState,
        editorStateManager.reinitializeState,
        controlGroupApi
      );

      const selectionsManager = initializeSelectionsManager(initialState);

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
          parentApi: controlGroupApi,
        },
        requestSize$: temporaryStateManager.api.requestSize$,
        runPastTimeout$: editorStateManager.api.runPastTimeout$,
        selectedOptions$: selectionsManager.api.selectedOptions$,
        searchTechnique$: editorStateManager.api.searchTechnique$,
        sort$,
        controlFetch$: (onReload: () => void) => controlGroupApi.controlFetch$(uuid, onReload),
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
        Boolean(initialState.selectedOptions?.length || initialState.existsSelected)
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
          const field = dataView && fieldName ? dataView.getFieldByName(fieldName) : undefined;

          let newFilter: Filter | undefined;
          if (dataView && field) {
            if (existsSelected) {
              newFilter = buildExistsFilter(field, dataView);
            } else if (selectedOptions && selectedOptions.length > 0) {
              newFilter =
                selectedOptions.length === 1
                  ? buildPhraseFilter(field, selectedOptions[0], dataView)
                  : buildPhrasesFilter(field, selectedOptions, dataView);
            }
          }
          if (newFilter) {
            newFilter.meta.key = field?.name;
            if (exclude) newFilter.meta.negate = true;
          }
          dataControlManager.internalApi.setOutputFilter(newFilter);
        });

      function serializeState() {
        return {
          rawState: {
            ...dataControlManager.getLatestState(),
            ...selectionsManager.getLatestState(),
            ...editorStateManager.getLatestState(),
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
        parentApi: controlGroupApi,
        serializeState,
        anyStateChange$: merge(
          dataControlManager.anyStateChange$,
          selectionsManager.anyStateChange$,
          editorStateManager.anyStateChange$,
          sort$
        ).pipe(map(() => undefined)),
        getComparators: () => {
          return {
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

      const componentApi: OptionsListComponentApi = {
        ...api,
        ...dataControlManager.api,
        ...editorStateManager.api,
        ...selectionsManager.api,
        ...temporaryStateManager.api,
        loadMoreSubject,
        deselectOption: (key: string | undefined) => {
          const field = api.field$.getValue();
          if (!key || !field) {
            api.setBlockingError(
              new Error(OptionsListStrings.control.getInvalidSelectionMessage())
            );
            return;
          }

          const keyAsType = getSelectionAsFieldType(field, key);

          // delete from selections
          const selectedOptions = selectionsManager.api.selectedOptions$.getValue() ?? [];
          const itemIndex = (selectionsManager.api.selectedOptions$.getValue() ?? []).indexOf(
            keyAsType
          );
          if (itemIndex !== -1) {
            const newSelections = [...selectedOptions];
            newSelections.splice(itemIndex, 1);
            selectionsManager.api.setSelectedOptions(newSelections);
          }
          // delete from invalid selections
          const currentInvalid = temporaryStateManager.api.invalidSelections$.getValue();
          if (currentInvalid.has(keyAsType)) {
            currentInvalid.delete(keyAsType);
            temporaryStateManager.api.setInvalidSelections(new Set(currentInvalid));
          }
        },
        makeSelection: (key: string | undefined, showOnlySelected: boolean) => {
          const field = api.field$.getValue();
          if (!key || !field) {
            api.setBlockingError(
              new Error(OptionsListStrings.control.getInvalidSelectionMessage())
            );
            return;
          }

          const existsSelected = Boolean(selectionsManager.api.existsSelected$.getValue());
          const selectedOptions = selectionsManager.api.selectedOptions$.getValue() ?? [];
          const singleSelect = editorStateManager.api.singleSelect$.getValue();

          // the order of these checks matters, so be careful if rearranging them
          const keyAsType = getSelectionAsFieldType(field, key);
          if (key === 'exists-option') {
            // if selecting exists, then deselect everything else
            selectionsManager.api.setExistsSelected(!existsSelected);
            if (!existsSelected) {
              selectionsManager.api.setSelectedOptions([]);
              temporaryStateManager.api.setInvalidSelections(new Set([]));
            }
          } else if (showOnlySelected || selectedOptions.includes(keyAsType)) {
            componentApi.deselectOption(key);
          } else if (singleSelect) {
            // replace selection
            selectionsManager.api.setSelectedOptions([keyAsType]);
            if (existsSelected) selectionsManager.api.setExistsSelected(false);
          } else {
            // select option
            if (existsSelected) selectionsManager.api.setExistsSelected(false);
            selectionsManager.api.setSelectedOptions(
              selectedOptions ? [...selectedOptions, keyAsType] : [keyAsType]
            );
          }
        },
        sort$,
        setSort: (sort: OptionsListSortingType | undefined) => {
          sort$.next(sort);
        },
        selectAll: (keys: string[]) => {
          const field = api.field$.getValue();
          if (keys.length < 1 || !field) {
            api.setBlockingError(
              new Error(OptionsListStrings.control.getInvalidSelectionMessage())
            );
            return;
          }

          const selectedOptions = selectionsManager.api.selectedOptions$.getValue() ?? [];
          const newSelections = keys.filter((key) => !selectedOptions.includes(key as string));
          selectionsManager.api.setSelectedOptions([...selectedOptions, ...newSelections]);
        },
        deselectAll: (keys: string[]) => {
          const field = api.field$.getValue();
          if (keys.length < 1 || !field) {
            api.setBlockingError(
              new Error(OptionsListStrings.control.getInvalidSelectionMessage())
            );
            return;
          }

          const selectedOptions = selectionsManager.api.selectedOptions$.getValue() ?? [];
          const remainingSelections = selectedOptions.filter(
            (option) => !keys.includes(option as string)
          );
          selectionsManager.api.setSelectedOptions(remainingSelections);
        },
      };

      if (selectionsManager.api.hasInitialSelections) {
        await dataControlManager.api.untilFiltersReady();
      }

      return {
        api,
        Component: ({ className: controlPanelClassName }) => {
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
              <OptionsListControl controlPanelClassName={controlPanelClassName} />
            </OptionsListControlContext.Provider>
          );
        },
      };
    },
  };
};
