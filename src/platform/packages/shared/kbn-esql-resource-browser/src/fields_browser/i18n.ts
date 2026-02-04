/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const FIELDS_BROWSER_I18N_KEYS = {
  title: i18n.translate('esqlEditor.fieldsBrowser.title', {
    defaultMessage: 'Fields',
  }),
  searchPlaceholder: i18n.translate('esqlEditor.fieldsBrowser.searchPlaceholder', {
    defaultMessage: 'Search',
  }),
  filterTitle: i18n.translate('esqlEditor.fieldsBrowser.filterTitle', {
    defaultMessage: 'Filter by field type',
  }),
  closeLabel: i18n.translate('esqlEditor.fieldsBrowser.closeLabel', {
    defaultMessage: 'Close',
  }),
  loading: i18n.translate('esqlEditor.fieldsBrowser.loading', {
    defaultMessage: 'Loading fields',
  }),
  empty: i18n.translate('esqlEditor.fieldsBrowser.empty', {
    defaultMessage: 'No fields found',
  }),
  noMatches: i18n.translate('esqlEditor.fieldsBrowser.noMatches', {
    defaultMessage: 'No fields match your search',
  }),
} as const;
