/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ControlFactory } from '../types';
import { SearchControlState, SEARCH_CONTROL_TYPE } from './types';
import { EuiFieldText } from '@elastic/eui';

export const getSearchEmbeddableFactory = (): ControlFactory<SearchControlState> => {
  return {
    type: SEARCH_CONTROL_TYPE,
    getIconType: () => 'search',
    getDisplayName: () =>
      i18n.translate('controlsExamples.searchControl.displayName', { defaultMessage: 'Search' }),
    getSupportedFieldTypes: () => ['string'],
    buildControl: (initialState, buildApi, uuid, parentApi) => {
      const api = buildApi({}, []);
      console.log('api', api);
      return {
        api,
        Component: () => (
          <EuiFieldText
            type="text"
            controlOnly
            className="euiFieldText--inGroup"
            id={uuid}
            fullWidth
          />
        ),
      };
    },
  };
};
