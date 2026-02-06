/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const DATA_SOURCE_BROWSER_I18N_KEYS = {
  title: i18n.translate('esqlEditor.indicesBrowser.title', {
    defaultMessage: 'Data sources',
  }),
  searchPlaceholder: i18n.translate('esqlEditor.indicesBrowser.searchPlaceholder', {
    defaultMessage: 'Search',
  }),
  filterTitle: i18n.translate('esqlEditor.indicesBrowser.filterTitle', {
    defaultMessage: 'Filter by data source type',
  }),
  integrationFilterTitle: i18n.translate('esqlEditor.indicesBrowser.integrationFilterTitle', {
    defaultMessage: 'Integrations',
  }),
  closeLabel: i18n.translate('esqlEditor.indicesBrowser.closeLabel', {
    defaultMessage: 'Close',
  }),
  loading: i18n.translate('esqlEditor.indicesBrowser.loading', {
    defaultMessage: 'Loading data sources',
  }),
  empty: i18n.translate('esqlEditor.indicesBrowser.empty', {
    defaultMessage: 'No data sources found',
  }),
  noMatches: i18n.translate('esqlEditor.indicesBrowser.noMatches', {
    defaultMessage: 'No data sources match your search',
  }),
} as const;
