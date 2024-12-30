/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const strings = {
  getDeleteFilterGroupButtonIconLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.deleteFilterGroupButtonIcon', {
      defaultMessage: 'Delete filter group',
    }),
  getAddOrFilterGroupButtonIconLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.addOrFilterGroupButtonIcon', {
      defaultMessage: 'Add filter group with OR',
    }),
  getAddOrFilterGroupButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.addOrFilterGroupButtonLabel', {
      defaultMessage: 'OR',
    }),
  getAddAndFilterGroupButtonIconLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.addAndFilterGroupButtonIcon', {
      defaultMessage: 'Add filter group with AND',
    }),
  getAddAndFilterGroupButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.addAndFilterGroupButtonLabel', {
      defaultMessage: 'AND',
    }),
  getDeleteButtonDisabled: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.deleteButtonDisabled', {
      defaultMessage: 'A minimum of one item is required.',
    }),
  getMoreActionsLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.moreActionsLabel', {
      defaultMessage: 'More actions',
    }),
};
