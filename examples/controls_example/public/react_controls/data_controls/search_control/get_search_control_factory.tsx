/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import deepEqual from 'react-fast-compare';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged } from 'rxjs';

import { EuiFieldSearch, EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';

import { initializeDataControl } from '../initialize_data_control';
import { DataControlFactory } from '../types';
import {
  SearchControlApi,
  SearchControlState,
  SearchControlTechniques,
  SEARCH_CONTROL_TYPE,
} from './types';

const allSearchOptions = [
  {
    id: 'match',
    label: i18n.translate('controlsExamples.searchControl.searchTechnique.match', {
      defaultMessage: 'Fuzzy match',
    }),
    'data-test-subj': 'searchControl__matchSearchOptionAdditionalSetting',
  },
  {
    id: 'simple_query_string',
    label: i18n.translate('controlsExamples.searchControl.searchTechnique.simpleQueryString', {
      defaultMessage: 'Query string',
    }),
    'data-test-subj': 'optionsListControl__queryStringSearchOptionAdditionalSetting',
  },
];

const DEFAULT_SEARCH_TECHNIQUE = 'match';

export const getSearchControlFactory = ({
  core,
  dataViewsService,
}: {
  core: CoreStart;
  dataViewsService: DataViewsPublicPluginStart;
}): DataControlFactory<SearchControlState, SearchControlApi> => {
  return {
    type: SEARCH_CONTROL_TYPE,
    getIconType: () => 'search',
    getDisplayName: () =>
      i18n.translate('controlsExamples.searchControl.displayName', { defaultMessage: 'Search' }),
    isFieldCompatible: (field) => {
      return (
        field.searchable &&
        field.spec.type === 'string' &&
        (field.spec.esTypes ?? []).includes('text')
      );
    },
    CustomOptionsComponent: ({ stateManager }) => {
      const searchTechnique = useStateFromPublishingSubject(stateManager.searchTechnique);

      return (
        <EuiFormRow label={'Searching'} data-test-subj="searchControl__searchOptionsRadioGroup">
          <EuiRadioGroup
            options={allSearchOptions}
            idSelected={searchTechnique ?? DEFAULT_SEARCH_TECHNIQUE}
            onChange={(id) => {
              const newSearchTechnique = id as SearchControlTechniques;
              stateManager.searchTechnique.next(newSearchTechnique);
            }}
          />
        </EuiFormRow>
      );
    },
    buildControl: (initialState, buildApi, uuid, parentApi) => {
      const searchString = new BehaviorSubject<string | undefined>(initialState.searchString);
      const searchTechnique = new BehaviorSubject<SearchControlTechniques | undefined>(
        initialState.searchTechnique ?? DEFAULT_SEARCH_TECHNIQUE
      );
      const editorStateManager = { searchTechnique };

      const dataControl = initializeDataControl<Pick<SearchControlState, 'searchTechnique'>>(
        uuid,
        SEARCH_CONTROL_TYPE,
        initialState,
        editorStateManager,
        parentApi,
        {
          core,
          dataViews: dataViewsService,
        }
      );

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
                searchString: searchString.getValue(),
                searchTechnique: searchTechnique.getValue(),
              },
              references, // does not have any references other than those provided by the data control serializer
            };
          },
          clearSelections: () => {
            searchString.next(undefined);
          },
        },
        {
          ...dataControl.comparators,
          searchTechnique: [
            searchTechnique,
            (newTechnique: SearchControlTechniques | undefined) =>
              searchTechnique.next(newTechnique),
          ],
          searchString: [
            searchString,
            (newString: string | undefined) =>
              searchString.next(newString?.length === 0 ? undefined : newString),
          ],
        }
      );

      /**
       * If either the search string or the search technique changes, recalulate the output filter
       */
      const onSearchStringChanged = combineLatest([searchString, searchTechnique])
        .pipe(debounceTime(200), distinctUntilChanged(deepEqual))
        .subscribe(([newSearchString, currentSearchTechnnique]) => {
          const currentDataView = dataControl.api.dataViews.getValue()?.[0];
          const currentField = dataControl.stateManager.fieldName.getValue();

          if (currentDataView && currentField) {
            if (newSearchString) {
              api.setOutputFilter(
                currentSearchTechnnique === 'match'
                  ? {
                      query: { match: { [currentField]: { query: newSearchString } } },
                      meta: { index: currentDataView.id },
                    }
                  : {
                      query: {
                        simple_query_string: {
                          query: newSearchString,
                          fields: [currentField],
                          default_operator: 'and',
                        },
                      },
                      meta: { index: currentDataView.id },
                    }
              );
            } else {
              api.setOutputFilter(undefined);
            }
          }
        });

      /**
       *  When the field changes (which can happen if either the field name or the dataview id changes),
       *  clear the previous search string.
       */
      const onFieldChanged = combineLatest([
        dataControl.stateManager.fieldName,
        dataControl.stateManager.dataViewId,
      ])
        .pipe(distinctUntilChanged(deepEqual))
        .subscribe(() => {
          searchString.next(undefined);
        });

      return {
        api,
        /**
         * The `conrolStyleProps` prop is necessary because it contains the props from the generic
         * ControlPanel that are necessary for styling
         */
        Component: (conrolStyleProps) => {
          const currentSearch = useStateFromPublishingSubject(searchString);

          useEffect(() => {
            return () => {
              // cleanup on unmount
              dataControl.cleanup();
              onSearchStringChanged.unsubscribe();
              onFieldChanged.unsubscribe();
            };
          }, []);

          return (
            <EuiFieldSearch
              {...conrolStyleProps}
              incremental={true}
              isClearable={false} // this will be handled by the clear floating action instead
              value={currentSearch ?? ''}
              onChange={(event) => {
                searchString.next(event.target.value);
              }}
              placeholder={i18n.translate('controls.searchControl.placeholder', {
                defaultMessage: 'Search...',
              })}
              id={uuid}
              fullWidth
            />
          );
        },
      };
    },
  };
};
