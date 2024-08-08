/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { BehaviorSubject, combineLatest, debounceTime, skip } from 'rxjs';

import { EuiFieldSearch, EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { euiThemeVars } from '@kbn/ui-theme';

import { Filter } from '@kbn/es-query';
import { initializeDataControl } from '../initialize_data_control';
import { DataControlFactory, DataControlServices } from '../types';
import {
  SearchControlApi,
  SearchControlState,
  SearchControlTechniques,
  SEARCH_CONTROL_TYPE,
} from './types';
import { initializeSearchControlSelections } from './search_control_selections';

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

export const getSearchControlFactory = (
  services: DataControlServices
): DataControlFactory<SearchControlState, SearchControlApi> => {
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
    CustomOptionsComponent: ({ initialState, updateState }) => {
      const [searchTechnique, setSearchTechnique] = useState(
        initialState.searchTechnique ?? DEFAULT_SEARCH_TECHNIQUE
      );

      return (
        <EuiFormRow label={'Searching'} data-test-subj="searchControl__searchOptionsRadioGroup">
          <EuiRadioGroup
            options={allSearchOptions}
            idSelected={searchTechnique}
            onChange={(id) => {
              const newSearchTechnique = id as SearchControlTechniques;
              setSearchTechnique(newSearchTechnique);
              updateState({ searchTechnique: newSearchTechnique });
            }}
          />
        </EuiFormRow>
      );
    },
    buildControl: async (initialState, buildApi, uuid, parentApi) => {
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
        services
      );

      const selections = initializeSearchControlSelections(
        initialState,
        dataControl.setters.onSelectionChange
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
                searchString: selections.searchString$.getValue(),
                searchTechnique: searchTechnique.getValue(),
              },
              references, // does not have any references other than those provided by the data control serializer
            };
          },
          clearSelections: () => {
            selections.setSearchString(undefined);
          },
        },
        {
          ...dataControl.comparators,
          ...selections.comparators,
          searchTechnique: [
            searchTechnique,
            (newTechnique: SearchControlTechniques | undefined) =>
              searchTechnique.next(newTechnique),
            (a, b) => (a ?? DEFAULT_SEARCH_TECHNIQUE) === (b ?? DEFAULT_SEARCH_TECHNIQUE),
          ],
        }
      );

      /**
       * If either the search string or the search technique changes, recalulate the output filter
       */
      const onSearchStringChanged = combineLatest([selections.searchString$, searchTechnique])
        .pipe(debounceTime(200))
        .subscribe(([newSearchString, currentSearchTechnnique]) => {
          const currentDataView = dataControl.api.dataViews.getValue()?.[0];
          const currentField = dataControl.stateManager.fieldName.getValue();

          let filter: Filter | undefined;
          if (currentDataView && currentField && newSearchString) {
            filter =
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
                  };
          }

          dataControl.setters.setOutputFilter(filter);
        });

      /**
       *  When the field changes (which can happen if either the field name or the dataview id changes),
       *  clear the previous search string.
       */
      const onFieldChanged = combineLatest([
        dataControl.stateManager.fieldName,
        dataControl.stateManager.dataViewId,
      ])
        .pipe(skip(1))
        .subscribe(() => {
          selections.setSearchString(undefined);
        });

      if (initialState.searchString?.length) {
        await dataControl.api.untilFiltersReady();
      }

      return {
        api,
        /**
         * The `controlPanelClassNamess` prop is necessary because it contains the class names from the generic
         * ControlPanel that are necessary for styling
         */
        Component: ({ className: controlPanelClassName }) => {
          const currentSearch = useStateFromPublishingSubject(selections.searchString$);

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
              className={controlPanelClassName}
              css={css`
                height: calc(${euiThemeVars.euiButtonHeight} - 2px) !important;
              `}
              incremental={true}
              isClearable={false} // this will be handled by the clear floating action instead
              value={currentSearch ?? ''}
              onChange={(event) => {
                selections.setSearchString(event.target.value);
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
