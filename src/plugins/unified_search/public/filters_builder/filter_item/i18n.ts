/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const strings = {
  getDragFilterAriaLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.dragFilterAriaLabel', {
      defaultMessage: 'Drag filter',
    }),
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
  getFieldSelectPlaceholderLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.fieldSelectPlaceholder', {
      defaultMessage: 'Select a field',
    }),
  getOperatorSelectPlaceholderSelectLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.operatorSelectPlaceholderSelect', {
      defaultMessage: 'Select operator',
    }),
  getSelectFieldPlaceholderLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.selectFieldPlaceholder', {
      defaultMessage: 'Please select a field first ...',
    }),
  getSelectOperatorPlaceholderLabel: () =>
    i18n.translate('unifiedSearch.filter.filtersBuilder.selectOperatorPlaceholder', {
      defaultMessage: 'Please select operator first ...',
    }),
};
