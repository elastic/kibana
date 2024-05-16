/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFieldText, EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { OverlayStart } from '@kbn/core-overlays-browser';
import { CoreStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import React, { useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { initializeDataControl } from '../initialize_data_control';
import { DataControlFactory } from '../types';
import { SearchControlState, SearchControlTechniques, SEARCH_CONTROL_TYPE } from './types';

const allSearchOptions = [
  {
    id: 'match',
    label: 'Fuzzy match',
    'data-test-subj': 'searchControl__matchSearchOptionAdditionalSetting',
  },
  {
    id: 'simple_query_string',
    label: 'Query string',
    'data-test-subj': 'optionsListControl__queryStringSearchOptionAdditionalSetting',
  },
];

const DEFAULT_SEARCH_TECHNIQUE = 'match';

export const getSearchEmbeddableFactory = ({
  core,
  dataViewsService,
}: {
  core: CoreStart;
  dataViewsService: DataViewsPublicPluginStart;
}): DataControlFactory<SearchControlState> => {
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
      console.log(initialState);

      const searchString = new BehaviorSubject<string>(initialState.searchString);
      const searchTechnique = new BehaviorSubject<SearchControlTechniques | undefined>(
        initialState.searchTechnique
      );

      const editorStateManager = { searchTechnique };

      const { dataControlApi, dataControlComparators } = initializeDataControl<
        Omit<SearchControlState, 'searchString'>
      >(SEARCH_CONTROL_TYPE, initialState, editorStateManager, parentApi, {
        core,
        dataViews: dataViewsService,
      });

      const api = buildApi(dataControlApi, {
        ...dataControlComparators,
        searchTechnique: [
          searchTechnique,
          (newTechnique: SearchControlTechniques | undefined) => searchTechnique.next(newTechnique),
        ],
        searchString: [searchString, (newString: string) => searchString.next(newString)],
      });

      return {
        api,
        Component: () => {
          return (
            <EuiFieldText
              type="text"
              controlOnly
              className="euiFieldText--inGroup"
              id={uuid}
              fullWidth
            />
          );
        },
      };
    },
  };
};
