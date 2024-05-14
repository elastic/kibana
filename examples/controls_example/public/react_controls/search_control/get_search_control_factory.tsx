/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFieldText } from '@elastic/eui';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { initializeDataControl } from '../initialize_data_control';
import { DataControlFactory } from '../types';
import { SearchControlState, SEARCH_CONTROL_TYPE } from './types';

export const getSearchEmbeddableFactory = ({
  dataViewsService,
}: {
  dataViewsService: DataViewsPublicPluginStart;
}): DataControlFactory<SearchControlState> => {
  return {
    type: SEARCH_CONTROL_TYPE,
    getIconType: () => 'search',
    getDisplayName: () =>
      i18n.translate('controlsExamples.searchControl.displayName', { defaultMessage: 'Search' }),
    // getSupportedFieldTypes: () => ['string'],
    isFieldCompatible: (field) => {
      return true;
    },
    CustomOptionsComponent: () => {
      return <>Custom Options</>;
    },
    buildControl: (initialState, buildApi, uuid, parentApi) => {
      // console.log('build control');
      const searchString$ = new BehaviorSubject<string>(initialState.searchString);
      // const grow = new BehaviorSubject<boolean | undefined>(initialState.grow);
      // const width = new BehaviorSubject<ControlWidth | undefined>(initialState.width);
      const dataLoading = new BehaviorSubject<boolean | undefined>(false);
      const blockingError = new BehaviorSubject<Error | undefined>(undefined);

      const { dataControlApi, dataControlComparators } = initializeDataControl(
        initialState,
        dataViewsService
      );
      const api = buildApi(
        { ...dataControlApi, dataLoading, blockingError, parentApi },
        {
          ...dataControlComparators,
          searchString: [searchString$, (newString) => searchString$.next(newString)],
          // grow: [grow, (newGrow) => grow.next(newGrow)],
          // width: [width, (newWidth) => width.next(newWidth)],
        }
      );
      // console.log('api', api);
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
