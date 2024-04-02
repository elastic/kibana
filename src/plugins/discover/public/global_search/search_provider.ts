/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ApplicationStart } from '@kbn/core/public';
import { from, of } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { GlobalSearchResultProvider } from '@kbn/global-search-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getInitialESQLQuery } from '@kbn/esql-utils';
import type { DiscoverAppLocator } from '../../common';

/**
 * Global search provider adding an ES|QL and ESQL entry.
 * This is necessary because ES|QL is part of the Discover application.
 *
 * It navigates to Discover with a default query extracted from the default dataview
 */
export const getESQLSearchProvider: (
  isESQLEnabled: boolean,
  uiCapabilities: Promise<ApplicationStart['capabilities']>,
  data: Promise<DataPublicPluginStart>,
  locator?: DiscoverAppLocator
) => GlobalSearchResultProvider = (isESQLEnabled, uiCapabilities, data, locator) => ({
  id: 'esql',
  find: ({ term = '', types, tags }) => {
    if (tags || (types && !types.includes('application')) || !locator || !isESQLEnabled) {
      return of([]);
    }

    return from(
      Promise.all([uiCapabilities, data]).then(async ([{ navLinks }, { dataViews }]) => {
        if (!navLinks.discover) {
          return [];
        }
        const title = i18n.translate('discover.globalSearch.esqlSearchTitle', {
          defaultMessage: 'Create ES|QL queries',
          description: 'ES|QL is a product name and should not be translated',
        });
        const defaultDataView = await dataViews.getDefaultDataView({ displayErrors: false });

        if (!defaultDataView) {
          return [];
        }

        const params = {
          query: {
            esql: getInitialESQLQuery(defaultDataView?.getIndexPattern()),
          },
          dataViewSpec: defaultDataView?.toSpec(),
        };

        const discoverLocation = await locator?.getLocation(params);

        term = term.toLowerCase();
        let score = 0;

        if (term === 'es|ql' || term === 'esql') {
          score = 100;
        } else if (term && ('es|ql'.includes(term) || 'esql'.includes(term))) {
          score = 90;
        }

        if (score === 0) return [];

        return [
          {
            id: 'esql',
            title,
            type: 'application',
            icon: 'logoKibana',
            meta: {
              categoryId: DEFAULT_APP_CATEGORIES.kibana.id,
              categoryLabel: DEFAULT_APP_CATEGORIES.kibana.label,
            },
            score,
            url: `/app/${discoverLocation.app}${discoverLocation.path}`,
          },
        ];
      })
    );
  },
  getSearchableTypes: () => ['application'],
});
