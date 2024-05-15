/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFieldText } from '@elastic/eui';
import { OverlayStart } from '@kbn/core-overlays-browser';
import { CoreStart } from '@kbn/core/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { initializeDataControl } from '../initialize_data_control';
import { DataControlFactory } from '../types';
import { SearchControlState, SEARCH_CONTROL_TYPE } from './types';

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
    CustomOptionsComponent: () => {
      return <>Custom Options</>;
    },
    buildControl: (initialState, buildApi, uuid, parentApi) => {
      // console.log('build control');
      const { dataControlApi, dataControlComparators } = initializeDataControl(
        initialState,
        parentApi,
        { core, dataViews: dataViewsService }
      );
      const searchString$ = new BehaviorSubject<string>(initialState.searchString);

      const api = buildApi(dataControlApi, {
        ...dataControlComparators,
        searchString: [searchString$, (newString: string) => searchString$.next(newString)],
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
