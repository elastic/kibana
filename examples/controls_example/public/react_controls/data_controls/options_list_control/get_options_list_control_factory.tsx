/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { BehaviorSubject, combineLatest, debounceTime, map } from 'rxjs';

import { OptionsListSearchTechnique } from '@kbn/controls-plugin/common/options_list/suggestions_searching';
import { OptionsListSortingType } from '@kbn/controls-plugin/common/options_list/suggestions_sorting';
import {
  OptionsListSuccessResponse,
  OptionsListSuggestions,
} from '@kbn/controls-plugin/common/options_list/types';
import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { initializeDataControl } from '../initialize_data_control';
import { DataControlFactory } from '../types';
import { OptionsListControl } from './components/options_list_control';
import {
  DEFAULT_SEARCH_TECHNIQUE,
  MIN_OPTIONS_LIST_REQUEST_SIZE,
  OPTIONS_LIST_CONTROL_TYPE,
  OPTIONS_LIST_DEFAULT_SORT,
} from './constants';
import { fetchAndValidate$ } from './fetch_and_validate';
import { OptionsListControlApi, OptionsListControlState } from './types';

export const getOptionsListControlFactory = ({
  core,
  dataService,
}: {
  core: CoreStart;
  dataService: DataPublicPluginStart;
}): DataControlFactory<OptionsListControlState, OptionsListControlApi> => {
  return {
    type: OPTIONS_LIST_CONTROL_TYPE,
    getIconType: () => 'editorChecklist',
    getDisplayName: () =>
      i18n.translate('controls.optionsList.displayName', {
        defaultMessage: 'Options list',
      }),
    isFieldCompatible: (field) => {
      return (
        !field.spec.scripted &&
        field.aggregatable &&
        ['string', 'boolean', 'ip', 'date', 'number'].includes(field.type)
      );
    },
    CustomOptionsComponent: () => {
      return <>Search techniques</>;
    },
    buildControl: (initialState, buildApi, uuid, controlGroupApi) => {
      /** State that is controlled via the editor */
      const searchTechnique$ = new BehaviorSubject<OptionsListSearchTechnique | undefined>(
        initialState.searchTechnique ?? DEFAULT_SEARCH_TECHNIQUE
      );
      const runPastTimeout$ = new BehaviorSubject<boolean | undefined>(initialState.runPastTimeout);
      const singleSelect$ = new BehaviorSubject<boolean | undefined>(initialState.singleSelect);

      /** State that is controlled via the control component */
      const selections$ = new BehaviorSubject<string[] | undefined>(
        initialState.selectedOptions ?? []
      );
      const sort$ = new BehaviorSubject<OptionsListSortingType | undefined>(
        initialState.sort ?? OPTIONS_LIST_DEFAULT_SORT
      );
      const existsSelected$ = new BehaviorSubject<boolean | undefined>(initialState.existsSelected);
      const excludeSelected$ = new BehaviorSubject<boolean | undefined>(initialState.exclude);
      const searchString$ = new BehaviorSubject<string>('');
      const requestSize$ = new BehaviorSubject<number>(MIN_OPTIONS_LIST_REQUEST_SIZE);

      /** State that is reliant on fetching */
      const availableOptions$ = new BehaviorSubject<OptionsListSuggestions | undefined>(undefined);
      const invalidSelections$ = new BehaviorSubject<Set<string>>(new Set());
      const allowExpensiveQueries$ = new BehaviorSubject<boolean>(true);
      const totalCardinality$ = new BehaviorSubject<number>(0);

      const dataControl = initializeDataControl<
        Pick<OptionsListControlState, 'searchTechnique' | 'singleSelect'>
      >(
        uuid,
        OPTIONS_LIST_CONTROL_TYPE,
        initialState,
        { searchTechnique: searchTechnique$, singleSelect: singleSelect$ },
        controlGroupApi,
        {
          core,
          dataViews: dataService.dataViews,
        }
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
        runPastTimeout: runPastTimeout$,
        requestSize: requestSize$,
      };

      const loadingSuggestions$ = new BehaviorSubject<boolean>(false);
      const loadingHasNoResults$ = new BehaviorSubject<boolean>(false);
      const dataLoadingSubscription = combineLatest([loadingSuggestions$, loadingHasNoResults$])
        .pipe(
          debounceTime(100), // debounce set loading so that it doesn't flash as the user types
          map((values) => values.some((value) => value))
        )
        .subscribe((isLoading) => {
          dataControl.api.setDataLoading(isLoading);
        });

      /** Fetch the suggestions and perform validation */
      const fetchSubscription = fetchAndValidate$({
        services: { http: core.http, uiSettings: core.uiSettings, data: dataService },
        api: {
          loadingSuggestions$,
          dataViews: dataControl.api.dataViews,
          dataControlFetch$: controlGroupApi.dataControlFetch$,
        },
        stateManager,
      }).subscribe((result) => {
        if (Object(result).hasOwnProperty('error')) {
          dataControl.api.setBlockingError((result as { error: Error }).error);
        }
        const successResponse = result as OptionsListSuccessResponse;
        availableOptions$.next(successResponse.suggestions);
        totalCardinality$.next(successResponse.totalCardinality ?? 0);
        invalidSelections$.next(new Set(successResponse.invalidSelections ?? []));
      });

      // const selectedOptionsSubscription = selections$
      //   .pipe(skip(1), debounceTime(100))
      //   .subscribe((newSelections) => {
      //     console.log('NEW SELECTIONS', newSelections);
      //     selectedOptions$.next(new Set<string>(newSelections));
      //   });

      const api = buildApi(
        {
          ...dataControl.api,
          getTypeDisplayName: () =>
            i18n.translate('controlsExamples.searchControl.displayName', {
              defaultMessage: 'Search',
            }),
          serializeState: () => {
            const { rawState: dataControlState, references } = dataControl.serialize();
            return {
              rawState: {
                ...dataControlState,
                searchTechnique: searchTechnique$.getValue(),
              },
              references, // does not have any references other than those provided by the data control serializer
            };
          },
          clearSelections: () => selections$.next([]),
        },
        {
          ...dataControl.comparators,
          exclude: [excludeSelected$, (selected) => excludeSelected$.next(selected)],
          existsSelected: [existsSelected$, (selected) => existsSelected$.next(selected)],
          runPastTimeout: [runPastTimeout$, (runPast) => runPastTimeout$.next(runPast)],
          searchTechnique: [searchTechnique$, (technique) => searchTechnique$.next(technique)],
          selectedOptions: [selections$, (selections) => selections$.next(selections)],
          singleSelect: [singleSelect$, (selected) => singleSelect$.next(selected)],
          sort: [sort$, (sort) => sort$.next(sort)],
        }
      );

      const componentApi = {
        ...api,
        selections$,
        deselectOption: (key: string) => {
          // delete from selections
          const selectedOptions = selections$.getValue() ?? [];
          const itemIndex = (selections$.getValue() ?? []).indexOf(key);
          if (itemIndex !== -1) {
            const newSelections = [...selectedOptions];
            newSelections.splice(itemIndex, 1);
            selections$.next(newSelections);
          }
          // delete from invalid selections
          const currentInvalid = invalidSelections$.getValue();
          if (currentInvalid.has(key)) {
            currentInvalid.delete(key);
            invalidSelections$.next(new Set(currentInvalid));
          }
        },
        makeSelection: (key: string, showOnlySelected: boolean) => {
          const existsSelected = Boolean(existsSelected$.getValue());
          const selectedOptions = selections$.getValue() ?? [];
          const singleSelect = singleSelect$.getValue();

          // the order of these checks matters, so be careful if rearranging them
          if (key === 'exists-option') {
            existsSelected$.next(!existsSelected);
            if (!existsSelected) selections$.next([]);
          } else if (showOnlySelected || selectedOptions.includes(key)) {
            componentApi.deselectOption(key);
          } else if (singleSelect) {
            // replace selection
            selections$.next([key]);
            if (existsSelected) existsSelected$.next(false);
          } else {
            // select option
            if (!selectedOptions) selections$.next([]);
            if (existsSelected) existsSelected$.next(false);
            selections$.next([...selectedOptions, key]);
          }
        },
        invalidSelections$,
        totalCardinality$,
        allowExpensiveQueries$,
        availableOptions$,
      };

      return {
        api,
        Component: (controlPanelClassNames) => {
          useEffect(() => {
            return () => {
              dataLoadingSubscription.unsubscribe();
              fetchSubscription.unsubscribe();
              // selectedOptionsSubscription.unsubscribe();
            };
          }, []);

          return (
            <OptionsListControl
              {...controlPanelClassNames}
              stateManager={stateManager}
              api={componentApi}
            />
          );
        },
      };
    },
  };
};
