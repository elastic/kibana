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
  OptionsListSearchTechnique,
  OptionsListSelection,
  OptionsListSortingType,
  OptionsListSuccessResponse,
  OptionsListSuggestions,
} from '../../../../common/options_list';
import { getSelectionAsFieldType, isValidSearch } from '../../../../common/options_list';
import { defaultDataControlComparators, initializeDataControl } from '../initialize_data_control';
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
import {
  initializeOptionsListSelections,
  selectionComparators,
} from './options_list_control_selections';
import { OptionsListStrings } from './options_list_strings';
import type { OptionsListControlApi } from './types';

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
      const searchTechnique$ = new BehaviorSubject<OptionsListSearchTechnique | undefined>(
        initialState.searchTechnique ?? DEFAULT_SEARCH_TECHNIQUE
      );
      const runPastTimeout$ = new BehaviorSubject<boolean | undefined>(initialState.runPastTimeout);
      const singleSelect$ = new BehaviorSubject<boolean | undefined>(initialState.singleSelect);
      const sort$ = new BehaviorSubject<OptionsListSortingType | undefined>(
        initialState.sort ?? OPTIONS_LIST_DEFAULT_SORT
      );

      const placeholder = initialState.placeholder;
      const hideActionBar = initialState.hideActionBar;
      const hideExclude = initialState.hideExclude;
      const hideExists = initialState.hideExists;
      const hideSort = initialState.hideSort;

      /** Runtime / component state - none of this is serialized */
      const searchString$ = new BehaviorSubject<string>('');
      const searchStringValid$ = new BehaviorSubject<boolean>(true);
      const requestSize$ = new BehaviorSubject<number>(MIN_OPTIONS_LIST_REQUEST_SIZE);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(undefined);
      const availableOptions$ = new BehaviorSubject<OptionsListSuggestions | undefined>(undefined);
      const invalidSelections$ = new BehaviorSubject<Set<OptionsListSelection>>(new Set());
      const totalCardinality$ = new BehaviorSubject<number>(0);

      const dataControl = initializeDataControl<
        Pick<OptionsListControlState, 'searchTechnique' | 'singleSelect' | 'runPastTimeout'>
      >(
        uuid,
        OPTIONS_LIST_CONTROL,
        'optionsListDataView',
        initialState,
        {
          searchTechnique: searchTechnique$,
          singleSelect: singleSelect$,
          runPastTimeout: runPastTimeout$,
        },
        controlGroupApi
      );

      const selections = initializeOptionsListSelections(
        initialState,
        dataControl.setters.onSelectionChange
      );

      const stateManager = {
        ...dataControl.stateManager,
        ...selections.stateManager,
        searchTechnique: searchTechnique$,
        singleSelect: singleSelect$,
        sort: sort$,
        searchString: searchString$,
        searchStringValid: searchStringValid$,
        runPastTimeout: runPastTimeout$,
        requestSize: requestSize$,
      };

      /** Handle loading state; since suggestion fetching and validation are tied, only need one loading subject */
      const loadingSuggestions$ = new BehaviorSubject<boolean>(false);
      const dataLoadingSubscription = combineLatest([
        loadingSuggestions$,
        dataControl.api.dataLoading$,
      ])
        .pipe(
          debounceTime(100), // debounce set loading so that it doesn't flash as the user types
          map((values) => values.some((value) => value))
        )
        .subscribe((isLoading) => {
          dataLoading$.next(isLoading);
        });

      /** Debounce the search string changes to reduce the number of fetch requests */
      const debouncedSearchString = stateManager.searchString.pipe(debounceTime(100));

      /** Validate the search string as the user types */
      const validSearchStringSubscription = combineLatest([
        debouncedSearchString,
        dataControl.api.field$,
        searchTechnique$,
      ]).subscribe(([newSearchString, field, searchTechnique]) => {
        searchStringValid$.next(
          isValidSearch({
            searchString: newSearchString,
            fieldType: field?.type,
            searchTechnique,
          })
        );
      });

      /** Clear state when the field changes */
      const fieldChangedSubscription = combineLatest([
        dataControl.stateManager.fieldName,
        dataControl.stateManager.dataViewId,
      ])
        .pipe(
          skip(1) // skip first, since this represents initialization
        )
        .subscribe(() => {
          searchString$.next('');
          selections.internalApi.setSelectedOptions(undefined);
          selections.internalApi.setExistsSelected(false);
          selections.internalApi.setExclude(false);
          requestSize$.next(MIN_OPTIONS_LIST_REQUEST_SIZE);
          sort$.next(OPTIONS_LIST_DEFAULT_SORT);
        });

      /** Fetch the suggestions and perform validation */
      const loadMoreSubject = new Subject<void>();
      const fetchSubscription = fetchAndValidate$({
        api: {
          ...dataControl.api,
          loadMoreSubject,
          loadingSuggestions$,
          debouncedSearchString,
          parentApi: controlGroupApi,
        },
        stateManager,
        controlFetch$: (onReload: () => void) => controlGroupApi.controlFetch$(uuid, onReload),
      }).subscribe((result) => {
        // if there was an error during fetch, set blocking error and return early
        if (Object.hasOwn(result, 'error')) {
          dataControl.api.setBlockingError((result as { error: Error }).error);
          return;
        } else if (dataControl.api.blockingError$.getValue()) {
          // otherwise,  if there was a previous error, clear it
          dataControl.api.setBlockingError(undefined);
        }

        // fetch was successful so set all attributes from result
        const successResponse = result as OptionsListSuccessResponse;
        availableOptions$.next(successResponse.suggestions);
        totalCardinality$.next(successResponse.totalCardinality ?? 0);
        invalidSelections$.next(new Set(successResponse.invalidSelections ?? []));

        // reset the request size back to the minimum (if it's not already)
        if (stateManager.requestSize.getValue() !== MIN_OPTIONS_LIST_REQUEST_SIZE) {
          stateManager.requestSize.next(MIN_OPTIONS_LIST_REQUEST_SIZE);
        }
      });

      /** Remove all other selections if this control becomes a single select */
      const singleSelectSubscription = singleSelect$
        .pipe(filter((singleSelect) => Boolean(singleSelect)))
        .subscribe(() => {
          const currentSelections = stateManager.selectedOptions.getValue() ?? [];
          if (currentSelections.length > 1)
            selections.internalApi.setSelectedOptions([currentSelections[0]]);
        });

      const hasSelections$ = new BehaviorSubject<boolean>(
        Boolean(initialState.selectedOptions?.length || initialState.existsSelected)
      );
      const hasSelectionsSubscription = combineLatest([
        stateManager.selectedOptions,
        stateManager.existsSelected,
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
        dataControl.api.dataViews$,
        dataControl.stateManager.fieldName,
        stateManager.selectedOptions,
        stateManager.existsSelected,
        stateManager.exclude,
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
          dataControl.setters.setOutputFilter(newFilter);
        });

      function serializeState() {
        const { rawState: dataControlState, references } = dataControl.getLatestState();
        return {
          rawState: {
            ...dataControlState,
            ...selections.getLatestState(),
            searchTechnique: searchTechnique$.getValue(),
            runPastTimeout: runPastTimeout$.getValue(),
            singleSelect: singleSelect$.getValue(),
            sort: sort$.getValue(),
            exclude: stateManager.exclude.getValue(),

            // serialize state that cannot be changed to keep it consistent
            placeholder,
            hideActionBar,
            hideExclude,
            hideExists,
            hideSort,
          },
          references, // does not have any references other than those provided by the data control serializer
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges<OptionsListControlState>({
        uuid,
        parentApi: controlGroupApi,
        serializeState,
        anyStateChange$: merge(
          dataControl.anyStateChange$,
          selections.anyStateChange$,
          runPastTimeout$,
          searchTechnique$,
          singleSelect$,
          sort$
        ).pipe(map(() => undefined)),
        getComparators: () => {
          return {
            ...defaultDataControlComparators,
            ...selectionComparators,
            runPastTimeout: 'referenceEquality',
            searchTechnique: 'referenceEquality',
            singleSelect: 'referenceEquality',
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
          dataControl.reinitializeState(lastSaved?.rawState);
          selections.reinitializeState(lastSaved?.rawState);
          runPastTimeout$.next(lastSaved?.rawState.runPastTimeout);
          searchTechnique$.next(lastSaved?.rawState.searchTechnique ?? DEFAULT_SEARCH_TECHNIQUE);
          singleSelect$.next(lastSaved?.rawState.singleSelect);
          sort$.next(lastSaved?.rawState.sort ?? OPTIONS_LIST_DEFAULT_SORT);
        },
      });

      const api = finalizeApi({
        ...unsavedChangesApi,
        ...dataControl.api,
        dataLoading$,
        getTypeDisplayName: OptionsListStrings.control.getDisplayName,
        serializeState,
        clearSelections: () => {
          if (stateManager.selectedOptions.getValue()?.length)
            selections.internalApi.setSelectedOptions([]);
          if (stateManager.existsSelected.getValue())
            selections.internalApi.setExistsSelected(false);
          if (invalidSelections$.getValue().size) invalidSelections$.next(new Set([]));
        },
        hasSelections$: hasSelections$ as PublishingSubject<boolean | undefined>,
        setSelectedOptions: (options: OptionsListSelection[] | undefined) => {
          selections.internalApi.setSelectedOptions(options);
        },
      });

      const componentApi = {
        ...api,
        loadMoreSubject,
        totalCardinality$,
        availableOptions$,
        invalidSelections$,
        setExclude: selections.internalApi.setExclude,
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
          const selectedOptions = stateManager.selectedOptions.getValue() ?? [];
          const itemIndex = (stateManager.selectedOptions.getValue() ?? []).indexOf(keyAsType);
          if (itemIndex !== -1) {
            const newSelections = [...selectedOptions];
            newSelections.splice(itemIndex, 1);
            selections.internalApi.setSelectedOptions(newSelections);
          }
          // delete from invalid selections
          const currentInvalid = invalidSelections$.getValue();
          if (currentInvalid.has(keyAsType)) {
            currentInvalid.delete(keyAsType);
            invalidSelections$.next(new Set(currentInvalid));
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

          const existsSelected = Boolean(stateManager.existsSelected.getValue());
          const selectedOptions = stateManager.selectedOptions.getValue() ?? [];
          const singleSelect = singleSelect$.getValue();

          // the order of these checks matters, so be careful if rearranging them
          const keyAsType = getSelectionAsFieldType(field, key);
          if (key === 'exists-option') {
            // if selecting exists, then deselect everything else
            selections.internalApi.setExistsSelected(!existsSelected);
            if (!existsSelected) {
              selections.internalApi.setSelectedOptions([]);
              invalidSelections$.next(new Set([]));
            }
          } else if (showOnlySelected || selectedOptions.includes(keyAsType)) {
            componentApi.deselectOption(key);
          } else if (singleSelect) {
            // replace selection
            selections.internalApi.setSelectedOptions([keyAsType]);
            if (existsSelected) selections.internalApi.setExistsSelected(false);
          } else {
            // select option
            if (existsSelected) selections.internalApi.setExistsSelected(false);
            selections.internalApi.setSelectedOptions(
              selectedOptions ? [...selectedOptions, keyAsType] : [keyAsType]
            );
          }
        },
      };

      if (selections.internalApi.hasInitialSelections) {
        await dataControl.api.untilFiltersReady();
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
            };
          }, []);

          return (
            <OptionsListControlContext.Provider
              value={{
                stateManager,
                api: componentApi,
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
