/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const strings = {
  getPanelTitleAdd: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.addFilterPopupTitle', {
      defaultMessage: 'Add filter',
    }),
  getPanelTitleEdit: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.editFilterPopupTitle', {
      defaultMessage: 'Edit filter',
    }),

  getAddButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.addButtonLabel', {
      defaultMessage: 'Add filter',
    }),
  getUpdateButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.updateButtonLabel', {
      defaultMessage: 'Update filter',
    }),
  getDisableToggleModeTooltip: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.disableToggleModeTooltip', {
      defaultMessage: '"Edit as Query DSL" operation is not supported for combined filters',
    }),
  getSelectDataViewToolTip: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.chooseDataViewFirstToolTip', {
      defaultMessage: 'You need to select a data view first',
    }),
  getCustomLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.createCustomLabelInputLabel', {
      defaultMessage: 'Custom label (optional)',
    }),
  getAddCustomLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.customLabelPlaceholder', {
      defaultMessage: 'Add a custom label here',
    }),
  getSelectDataView: () =>
    i18n.translate('unifiedSearch.filter.filterBar.indexPatternSelectPlaceholder', {
      defaultMessage: 'Select a data view',
    }),
  getDataView: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.dateViewSelectLabel', {
      defaultMessage: 'Data view',
    }),
  getQueryDslLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.queryDslLabel', {
      defaultMessage: 'Elasticsearch Query DSL',
    }),
  getQueryDslAriaLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.queryDslAriaLabel', {
      defaultMessage: 'Elasticsearch Query DSL editor',
    }),
  getIsOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isOperatorOptionLabel', {
      defaultMessage: 'is',
    }),
  getIsNotOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isNotOperatorOptionLabel', {
      defaultMessage: 'is not',
    }),
  getIsOneOfOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isOneOfOperatorOptionLabel', {
      defaultMessage: 'is one of',
    }),
  getIsNotOneOfOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isNotOneOfOperatorOptionLabel', {
      defaultMessage: 'is not one of',
    }),
  getIsBetweenOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isBetweenOperatorOptionLabel', {
      defaultMessage: 'is between',
    }),
  getIsNotBetweenOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isNotBetweenOperatorOptionLabel', {
      defaultMessage: 'is not between',
    }),
  getExistsOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.existsOperatorOptionLabel', {
      defaultMessage: 'exists',
    }),
  getDoesNotExistOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.doesNotExistOperatorOptionLabel', {
      defaultMessage: 'does not exist',
    }),
  getInvalidDateFormatProvidedErrorMessage: () =>
    i18n.translate('unifiedSearch.filter.filterBar.invalidDateFormatProvidedErrorMessage', {
      defaultMessage: 'Invalid date format provided',
    }),
};
