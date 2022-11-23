/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const strings = {
  getAddFilterButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.filterBar.addFilterButtonLabel', {
      defaultMessage: 'Add filter',
    }),
  getSwitchLanguageButtonText: () =>
    i18n.translate('unifiedSearch.switchLanguage.buttonText', {
      defaultMessage: 'Switch language button.',
    }),
  getNoDataPopoverContent: () =>
    i18n.translate('unifiedSearch.noDataPopover.content', {
      defaultMessage:
        "This time range doesn't contain any data. Increase or adjust the time range to see more fields and create charts.",
    }),
  getNoDataPopoverSubtitle: () =>
    i18n.translate('unifiedSearch.noDataPopover.subtitle', { defaultMessage: 'Tip' }),

  getNoDataPopoverTitle: () =>
    i18n.translate('unifiedSearch.noDataPopover.title', {
      defaultMessage: 'Empty dataset',
    }),

  getNoDataPopoverDismissAction: () =>
    i18n.translate('unifiedSearch.noDataPopover.dismissAction', {
      defaultMessage: "Don't show again",
    }),
  getLuceneLanguageName: () =>
    i18n.translate('unifiedSearch.query.queryBar.luceneLanguageName', {
      defaultMessage: 'Lucene',
    }),
  getKqlLanguageName: () =>
    i18n.translate('unifiedSearch.query.queryBar.kqlLanguageName', {
      defaultMessage: 'KQL',
    }),
  getOptionsAddFilterButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.addFilterButtonLabel', {
      defaultMessage: 'Add filter',
    }),
  getOptionsApplyAllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.applyAllFiltersButtonLabel', {
      defaultMessage: 'Apply to all',
    }),
  getLoadOtherFilterSetLabel: () =>
    i18n.translate('unifiedSearch.filter.options.loadOtherFilterSetLabel', {
      defaultMessage: 'Load other saved query',
    }),
  getLoadCurrentFilterSetLabel: () =>
    i18n.translate('unifiedSearch.filter.options.loadCurrentFilterSetLabel', {
      defaultMessage: 'Load saved query',
    }),
  getSaveAsNewFilterSetLabel: () =>
    i18n.translate('unifiedSearch.filter.options.saveAsNewFilterSetLabel', {
      defaultMessage: 'Save as new',
    }),
  getSaveFilterSetLabel: () =>
    i18n.translate('unifiedSearch.filter.options.saveFilterSetLabel', {
      defaultMessage: 'Save saved query',
    }),
  getClearllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.clearllFiltersButtonLabel', {
      defaultMessage: 'Clear all',
    }),
  getSavedQueryLabel: () =>
    i18n.translate('unifiedSearch.search.searchBar.savedQuery', {
      defaultMessage: 'Saved query',
    }),
  getSavedQueryPopoverSaveChangesButtonAriaLabel: (title?: string) =>
    i18n.translate('unifiedSearch.search.searchBar.savedQueryPopoverSaveChangesButtonAriaLabel', {
      defaultMessage: 'Save changes to {title}',
      values: { title },
    }),
  getSavedQueryPopoverSaveChangesButtonText: () =>
    i18n.translate('unifiedSearch.search.searchBar.savedQueryPopoverSaveChangesButtonText', {
      defaultMessage: 'Save changes',
    }),
  getSavedQueryPopoverSaveAsNewButtonAriaLabel: () =>
    i18n.translate('unifiedSearch.search.searchBar.savedQueryPopoverSaveAsNewButtonAriaLabel', {
      defaultMessage: 'Save as new saved query',
    }),
  getSavedQueryPopoverSaveAsNewButtonText: () =>
    i18n.translate('unifiedSearch.search.searchBar.savedQueryPopoverSaveAsNewButtonText', {
      defaultMessage: 'Save as new',
    }),
  getSaveCurrentFilterSetLabel: () =>
    i18n.translate('unifiedSearch.filter.options.saveCurrentFilterSetLabel', {
      defaultMessage: 'Save current saved query',
    }),
  getApplyAllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.applyAllFiltersButtonLabel', {
      defaultMessage: 'Apply to all',
    }),
  getEnableAllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.enableAllFiltersButtonLabel', {
      defaultMessage: 'Enable all',
    }),
  getDisableAllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.disableAllFiltersButtonLabel', {
      defaultMessage: 'Disable all',
    }),
  getInvertNegatedFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.invertNegatedFiltersButtonLabel', {
      defaultMessage: 'Invert inclusion',
    }),
  getPinAllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.pinAllFiltersButtonLabel', {
      defaultMessage: 'Pin all',
    }),
  getUnpinAllFiltersButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.unpinAllFiltersButtonLabel', {
      defaultMessage: 'Unpin all',
    }),
  getFilterLanguageLabel: () =>
    i18n.translate('unifiedSearch.filter.options.filterLanguageLabel', {
      defaultMessage: 'Filter language',
    }),
  getFilterSetButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.options.filterSetButtonLabel', {
      defaultMessage: 'Saved query menu',
    }),
  getNeedsUpdatingLabel: () =>
    i18n.translate('unifiedSearch.queryBarTopRow.submitButton.update', {
      defaultMessage: 'Needs updating',
    }),
  getRefreshQueryLabel: () =>
    i18n.translate('unifiedSearch.queryBarTopRow.submitButton.refresh', {
      defaultMessage: 'Refresh query',
    }),
  getRunQueryLabel: () =>
    i18n.translate('unifiedSearch.queryBarTopRow.submitButton.run', {
      defaultMessage: 'Run query',
    }),
  getSearchInputPlaceholderForText: () =>
    i18n.translate('unifiedSearch.query.queryBar.searchInputPlaceholderForText', {
      defaultMessage: 'Filter your data',
    }),
  getSearchInputPlaceholder: (language: string) =>
    i18n.translate('unifiedSearch.query.queryBar.searchInputPlaceholder', {
      defaultMessage: 'Filter your data using {language} syntax',
      values: { language },
    }),
  getQueryBarComboboxAriaLabel: (pageType: string) =>
    i18n.translate('unifiedSearch.query.queryBar.comboboxAriaLabel', {
      defaultMessage: 'Search and filter the {pageType} page',
      values: { pageType },
    }),
  getQueryBarSearchInputAriaLabel: (pageType: string) =>
    i18n.translate('unifiedSearch.query.queryBar.searchInputAriaLabel', {
      defaultMessage: 'Start typing to search and filter the {pageType} page',
      values: { pageType },
    }),
  getQueryBarClearInputLabel: () =>
    i18n.translate('unifiedSearch.query.queryBar.clearInputLabel', {
      defaultMessage: 'Clear input',
    }),
  getKQLNestedQuerySyntaxInfoTitle: () =>
    i18n.translate('unifiedSearch.query.queryBar.KQLNestedQuerySyntaxInfoTitle', {
      defaultMessage: 'KQL nested query syntax',
    }),
};
