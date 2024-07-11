/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { BehaviorSubject, combineLatest, debounceTime, map, Subject } from 'rxjs';

import { OptionsListSearchTechnique } from '@kbn/controls-plugin/common/options_list/suggestions_searching';
import { OptionsListSortingType } from '@kbn/controls-plugin/common/options_list/suggestions_sorting';
import {
  OptionsListSuccessResponse,
  OptionsListSuggestions,
} from '@kbn/controls-plugin/common/options_list/types';
import { CoreStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';

import { initializeDataControl } from '../initialize_data_control';
import { DataControlFactory } from '../types';
import { OptionsListControl } from './components/options_list_control';
import {
  DEFAULT_SEARCH_TECHNIQUE,
  MIN_OPTIONS_LIST_REQUEST_SIZE,
  OPTIONS_LIST_CONTROL_TYPE,
  OPTIONS_LIST_DEFAULT_SORT,
} from './constants';
import { fetchSuggestions$ } from './fetch_suggestions';
import { OptionsListControlApi, OptionsListControlState } from './types';

export const getOptionsListControlFactory = ({
  core,
  dataViewsService,
}: {
  core: CoreStart;
  dataViewsService: DataViewsPublicPluginStart;
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
      /** Editor state */
      const searchTechnique$ = new BehaviorSubject<OptionsListSearchTechnique | undefined>(
        initialState.searchTechnique ?? DEFAULT_SEARCH_TECHNIQUE
      );
      const singleSelect$ = new BehaviorSubject<boolean | undefined>(initialState.singleSelect);
      const runPastTimeout$ = new BehaviorSubject<boolean | undefined>(initialState.runPastTimeout);
      const editorStateManager = { searchTechnique: searchTechnique$, singleSelect: singleSelect$ };

      /** Popover state */
      const selections$ = new BehaviorSubject<string[] | undefined>(
        initialState.selectedOptions ?? []
      );
      const sort$ = new BehaviorSubject<OptionsListSortingType | undefined>(
        initialState.sort ?? OPTIONS_LIST_DEFAULT_SORT
      );
      const existsSelected$ = new BehaviorSubject<boolean | undefined>(initialState.existsSelected);
      const excludeSelected$ = new BehaviorSubject<boolean | undefined>(initialState.exclude);

      const dataLoading$ = new BehaviorSubject<boolean | undefined>(undefined);
      const searchString$ = new BehaviorSubject<string>('');
      const invalidSelections$ = new BehaviorSubject<string[]>([]);
      const totalCardinality$ = new BehaviorSubject<number>(0);
      const allowExpensiveQueries$ = new BehaviorSubject<boolean>(true);
      const availableOptions$ = new BehaviorSubject<OptionsListSuggestions | undefined>(undefined);
      const requestSize$ = new BehaviorSubject<number>(MIN_OPTIONS_LIST_REQUEST_SIZE);

      const dataControl = initializeDataControl<Pick<OptionsListControlState, 'searchTechnique'>>(
        uuid,
        OPTIONS_LIST_CONTROL_TYPE,
        initialState,
        editorStateManager,
        controlGroupApi,
        {
          core,
          dataViews: dataViewsService,
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
        runPastTimeout: runPastTimeout$, // TODO: remove
        requestSize: requestSize$,
      };

      const api = buildApi(
        {
          ...dataControl.api,
          invalidSelections$,
          totalCardinality$,
          allowExpensiveQueries$,
          availableOptions$,
          dataLoading: dataLoading$,
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
          clearSelections: () => {
            // TODO: Reset selections
          },
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

      const loadingSuggestions$ = new BehaviorSubject<boolean>(false);
      const loadingHasNoResults$ = new BehaviorSubject<boolean>(false);
      const dataLoadingSubscription = combineLatest([loadingSuggestions$, loadingHasNoResults$])
        .pipe(
          debounceTime(100), // debounce set loading so that it doesn't flash as the user types
          map((values) => values.some((value) => value))
        )
        .subscribe((isLoading) => {
          dataLoading$.next(isLoading);
        });

      const fetchSubscription = fetchSuggestions$({
        services: { http: core.http },
        api: {
          loadingSuggestions$,
          dataViews: dataControl.api.dataViews,
          dataControlFetch$: controlGroupApi.dataControlFetch$,
        },
        stateManager,
      }).subscribe((result) => {
        console.log('fetch', result);
        if (Object(result).hasOwnProperty('error')) {
          return;
        }
        availableOptions$.next((result as OptionsListSuccessResponse).suggestions);
        totalCardinality$.next((result as OptionsListSuccessResponse).totalCardinality ?? 0);
        invalidSelections$.next((result as OptionsListSuccessResponse).invalidSelections ?? []);
      });

      return {
        api,
        Component: (controlPanelClassNames) => {
          useEffect(() => {
            return () => {
              dataLoadingSubscription.unsubscribe();
              fetchSubscription.unsubscribe();
            };
          }, []);

          return (
            <OptionsListControl {...controlPanelClassNames} stateManager={stateManager} api={api} />
          );
        },
      };
    },
  };
};
