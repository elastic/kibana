/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  GlobalSearchProviderResult,
  GlobalSearchResultProvider,
} from '@kbn/global-search-plugin/public';
import { DEFAULT_APP_CATEGORIES, type CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { getInitialESQLQuery } from '@kbn/esql-utils';
import type { DiscoverAppLocator } from '../../common';
import type { DiscoverStartPlugins } from '../types';

export const searchProviderFind: (
  options: {
    isESQLEnabled: boolean;
    locator?: DiscoverAppLocator;
    getServices: () => Promise<[CoreStart, DiscoverStartPlugins]>;
  },
  ...findParams: Parameters<GlobalSearchResultProvider['find']>
) => Promise<GlobalSearchProviderResult[]> = async (
  { isESQLEnabled, locator, getServices },
  { term = '', types, tags }
) => {
  if (tags || (types && !types.includes('application')) || !locator || !isESQLEnabled) {
    return [];
  }

  const [core, { dataViews }] = await getServices();

  if (!core.application.capabilities.navLinks.discover) {
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
      esql: getInitialESQLQuery(defaultDataView),
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
};
