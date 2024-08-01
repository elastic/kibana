/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject, combineLatest, debounceTime, filter, skip } from 'rxjs';

import { OptionsListSearchTechnique } from '@kbn/controls-plugin/common/options_list/suggestions_searching';
import { OptionsListSortingType } from '@kbn/controls-plugin/common/options_list/suggestions_sorting';
import {
  OptionsListSuccessResponse,
  OptionsListSuggestions,
} from '@kbn/controls-plugin/common/options_list/types';
import { buildExistsFilter, buildPhraseFilter, buildPhrasesFilter, Filter } from '@kbn/es-query';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import {
  getSelectionAsFieldType,
  OptionsListSelection,
} from '../../../../common/options_list/options_list_selections';
import { isValidSearch } from '../../../../common/options_list/suggestions_searching';
import { initializeDataControl } from '../initialize_data_control';
import { DataControlFactory, DataControlServices } from '../types';
import { OptionsListControl } from './components/options_list_control';
import { OptionsListEditorOptions } from './components/options_list_editor_options';
import {
  DEFAULT_SEARCH_TECHNIQUE,
  MIN_OPTIONS_LIST_REQUEST_SIZE,
  OPTIONS_LIST_CONTROL_TYPE,
  OPTIONS_LIST_DEFAULT_SORT,
} from './constants';
import { fetchAndValidate$ } from './fetch_and_validate';
import { OptionsListControlContext } from './options_list_context_provider';
import { OptionsListStrings } from './options_list_strings';
import { OptionsListControlApi, OptionsListControlState } from './types';

export const getOptionsListControlFactory = (
  services: DataControlServices
): DataControlFactory<OptionsListControlState, OptionsListControlApi> => {
  return {
    type: OPTIONS_LIST_CONTROL_TYPE,
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
    buildControl: async (initialState, buildApi, uuid, controlGroupApi) => {
      /** Serializable state - i.e. the state that is saved with the control */
      const searchTechnique$ = new BehaviorSubject<OptionsListSearchTechnique | undefined>(
        initialState.searchTechnique ?? DEFAULT_SEARCH_TECHNIQUE
      );
      const runPastTimeout$ = new BehaviorSubject<boolean | undefined>(initialState.runPastTimeout);
      const singleSelect$ = new BehaviorSubject<boolean | undefined>(initialState.singleSelect);
      const selections$ = new BehaviorSubject<OptionsListSelection[] | undefined>(
        initialState.selectedOptions ?? []
      );
      const sort$ = new BehaviorSubject<OptionsListSortingType | undefined>(
        initialState.sort ?? OPTIONS_LIST_DEFAULT_SORT
      );
      const existsSelected$ = new BehaviorSubject<boolean | undefined>(initialState.existsSelected);
      const excludeSelected$ = new BehaviorSubject<boolean | undefined>(initialState.exclude);

      /** Creation options state - cannot currently be changed after creation, but need subjects for comparators */
      const placeholder$ = new BehaviorSubject<string | undefined>(initialState.placeholder);
      const hideActionBar$ = new BehaviorSubject<boolean | undefined>(initialState.hideActionBar);
      const hideExclude$ = new BehaviorSubject<boolean | undefined>(initialState.hideExclude);
      const hideExists$ = new BehaviorSubject<boolean | undefined>(initialState.hideExists);
      const hideSort$ = new BehaviorSubject<boolean | undefined>(initialState.hideSort);

      /** Runtime / component state - none of this is serialized */
      const searchString$ = new BehaviorSubject<string>('');
      const searchStringValid$ = new BehaviorSubject<boolean>(true);
      const requestSize$ = new BehaviorSubject<number>(MIN_OPTIONS_LIST_REQUEST_SIZE);

      const availableOptions$ = new BehaviorSubject<OptionsListSuggestions | undefined>(undefined);
      const invalidSelections$ = new BehaviorSubject<Set<OptionsListSelection>>(new Set());
      const totalCardinality$ = new BehaviorSubject<number>(0);

      const dataControl = initializeDataControl<
        Pick<OptionsListControlState, 'searchTechnique' | 'singleSelect'>
      >(
        uuid,
        OPTIONS_LIST_CONTROL_TYPE,
        initialState,
        { searchTechnique: searchTechnique$, singleSelect: singleSelect$ },
        controlGroupApi,
        services
      );

      const stateManager = {
        ...dataControl.stateManager,
        exclude: excludeSelected$,
        existsSelected: existsSelected$,
        searchTechnique: searchTechnique$,
        selectedOptions: selections$,
        singleSelect: singleSelect$,
        sort: sort$,
        searchString: searchString$,
        searchStringValid: searchStringValid$,
        runPastTimeout: runPastTimeout$,
        requestSize: requestSize$,
      };

      /** Handle loading state; since suggestion fetching and validation are tied, only need one loading subject */
      const loadingSuggestions$ = new BehaviorSubject<boolean>(false);
      const dataLoadingSubscription = loadingSuggestions$
        .pipe(
          debounceTime(100) // debounce set loading so that it doesn't flash as the user types
        )
        .subscribe((isLoading) => {
          dataControl.api.setDataLoading(isLoading);
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
          selections$.next(undefined);
          existsSelected$.next(false);
          excludeSelected$.next(false);
          requestSize$.next(MIN_OPTIONS_LIST_REQUEST_SIZE);
          sort$.next(OPTIONS_LIST_DEFAULT_SORT);
        });

      /** Fetch the suggestions and perform validation */
      const loadMoreSubject = new BehaviorSubject<null>(null);
      const fetchSubscription = fetchAndValidate$({
        services,
        api: {
          ...dataControl.api,
          loadMoreSubject,
          loadingSuggestions$,
          debouncedSearchString,
          parentApi: controlGroupApi,
          controlFetch$: controlGroupApi.controlFetch$(uuid),
        },
        stateManager,
      }).subscribe((result) => {
        // if there was an error during fetch, set blocking error and return early
        if (Object.hasOwn(result, 'error')) {
          dataControl.api.setBlockingError((result as { error: Error }).error);
          return;
        } else if (dataControl.api.blockingError.getValue()) {
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
          const currentSelections = selections$.getValue() ?? [];
          if (currentSelections.length > 1) selections$.next([currentSelections[0]]);
        });

      /** Output filters when selections change */
      const outputFilterSubscription = combineLatest([
        dataControl.api.dataViews,
        dataControl.stateManager.fieldName,
        selections$,
        existsSelected$,
        excludeSelected$,
      ]).subscribe(([dataViews, fieldName, selections, existsSelected, exclude]) => {
        const dataView = dataViews?.[0];
        const field = dataView && fieldName ? dataView.getFieldByName(fieldName) : undefined;

        if (!dataView || !field) return;

        let newFilter: Filter | undefined;
        if (existsSelected) {
          newFilter = buildExistsFilter(field, dataView);
        } else if (selections && selections.length > 0) {
          newFilter =
            selections.length === 1
              ? buildPhraseFilter(field, selections[0], dataView)
              : buildPhrasesFilter(field, selections, dataView);
        }
        if (newFilter) {
          newFilter.meta.key = field?.name;
          if (exclude) newFilter.meta.negate = true;
        }
        api.setOutputFilter(newFilter);
      });

      const api = buildApi(
        {
          ...dataControl.api,
          getTypeDisplayName: OptionsListStrings.control.getDisplayName,
          serializeState: () => {
            const { rawState: dataControlState, references } = dataControl.serialize();
            return {
              rawState: {
                ...dataControlState,
                searchTechnique: searchTechnique$.getValue(),
                runPastTimeout: runPastTimeout$.getValue(),
                singleSelect: singleSelect$.getValue(),
                selections: selections$.getValue(),
                sort: sort$.getValue(),
                existsSelected: existsSelected$.getValue(),
                exclude: excludeSelected$.getValue(),

                // serialize state that cannot be changed to keep it consistent
                placeholder: placeholder$.getValue(),
                hideActionBar: hideActionBar$.getValue(),
                hideExclude: hideExclude$.getValue(),
                hideExists: hideExists$.getValue(),
                hideSort: hideSort$.getValue(),
              },
              references, // does not have any references other than those provided by the data control serializer
            };
          },
          clearSelections: () => {
            if (selections$.getValue()?.length) selections$.next([]);
            if (existsSelected$.getValue()) existsSelected$.next(false);
            if (invalidSelections$.getValue().size) invalidSelections$.next(new Set([]));
          },
        },
        {
          ...dataControl.comparators,
          exclude: [excludeSelected$, (selected) => excludeSelected$.next(selected)],
          existsSelected: [existsSelected$, (selected) => existsSelected$.next(selected)],
          runPastTimeout: [runPastTimeout$, (runPast) => runPastTimeout$.next(runPast)],
          searchTechnique: [
            searchTechnique$,
            (technique) => searchTechnique$.next(technique),
            (a, b) => (a ?? DEFAULT_SEARCH_TECHNIQUE) === (b ?? DEFAULT_SEARCH_TECHNIQUE),
          ],
          selectedOptions: [
            selections$,
            (selections) => selections$.next(selections),
            (a, b) => deepEqual(a ?? [], b ?? []),
          ],
          singleSelect: [singleSelect$, (selected) => singleSelect$.next(selected)],
          sort: [
            sort$,
            (sort) => sort$.next(sort),
            (a, b) => (a ?? OPTIONS_LIST_DEFAULT_SORT) === (b ?? OPTIONS_LIST_DEFAULT_SORT),
          ],

          /** This state cannot currently be changed after the control is created */
          placeholder: [placeholder$, (placeholder) => placeholder$.next(placeholder)],
          hideActionBar: [hideActionBar$, (hideActionBar) => hideActionBar$.next(hideActionBar)],
          hideExclude: [hideExclude$, (hideExclude) => hideExclude$.next(hideExclude)],
          hideExists: [hideExists$, (hideExists) => hideExists$.next(hideExists)],
          hideSort: [hideSort$, (hideSort) => hideSort$.next(hideSort)],
        }
      );

      const componentApi = {
        ...api,
        selections$,
        loadMoreSubject,
        totalCardinality$,
        availableOptions$,
        invalidSelections$,
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
          const selectedOptions = selections$.getValue() ?? [];
          const itemIndex = (selections$.getValue() ?? []).indexOf(keyAsType);
          if (itemIndex !== -1) {
            const newSelections = [...selectedOptions];
            newSelections.splice(itemIndex, 1);
            selections$.next(newSelections);
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

          const existsSelected = Boolean(existsSelected$.getValue());
          const selectedOptions = selections$.getValue() ?? [];
          const singleSelect = singleSelect$.getValue();

          // the order of these checks matters, so be careful if rearranging them
          const keyAsType = getSelectionAsFieldType(field, key);
          if (key === 'exists-option') {
            // if selecting exists, then deselect everything else
            existsSelected$.next(!existsSelected);
            if (!existsSelected) {
              selections$.next([]);
              invalidSelections$.next(new Set([]));
            }
          } else if (showOnlySelected || selectedOptions.includes(keyAsType)) {
            componentApi.deselectOption(key);
          } else if (singleSelect) {
            // replace selection
            selections$.next([keyAsType]);
            if (existsSelected) existsSelected$.next(false);
          } else {
            // select option
            if (!selectedOptions) selections$.next([]);
            if (existsSelected) existsSelected$.next(false);
            selections$.next([...selectedOptions, keyAsType]);
          }
        },
      };

      if (initialState.selectedOptions?.length || initialState.existsSelected) {
        // has selections, so wait for initialization of filters
        await dataControl.untilFiltersInitialized();
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
            };
          }, []);

          /** Get display settings - if these are ever made editable, should be part of stateManager instead */
          const [placeholder, hideActionBar, hideExclude, hideExists, hideSort] =
            useBatchedPublishingSubjects(
              placeholder$,
              hideActionBar$,
              hideExclude$,
              hideExists$,
              hideSort$
            );

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
