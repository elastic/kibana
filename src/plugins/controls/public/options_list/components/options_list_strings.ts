/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const OptionsListStrings = {
  control: {
    getSeparator: () =>
      i18n.translate('controls.optionsList.control.separator', {
        defaultMessage: ', ',
      }),
    getPlaceholder: () =>
      i18n.translate('controls.optionsList.control.placeholder', {
        defaultMessage: 'Any',
      }),
    getNegate: () =>
      i18n.translate('controls.optionsList.control.negate', {
        defaultMessage: 'NOT',
      }),
    getExcludeExists: () =>
      i18n.translate('controls.optionsList.control.excludeExists', {
        defaultMessage: 'DOES NOT',
      }),
  },
  editor: {
    getAllowMultiselectTitle: () =>
      i18n.translate('controls.optionsList.editor.allowMultiselectTitle', {
        defaultMessage: 'Allow multiple selections in dropdown',
      }),
    getRunPastTimeoutTitle: () =>
      i18n.translate('controls.optionsList.editor.runPastTimeout', {
        defaultMessage: 'Ignore timeout for results',
      }),
    getRunPastTimeoutTooltip: () =>
      i18n.translate('controls.optionsList.editor.runPastTimeout.tooltip', {
        defaultMessage:
          'Wait to display results until the list is complete. This setting is useful for large data sets, but the results might take longer to populate.',
      }),
  },
  popover: {
    getAriaLabel: (fieldName: string) =>
      i18n.translate('controls.optionsList.popover.ariaLabel', {
        defaultMessage: 'Popover for {fieldName} control',
        values: { fieldName },
      }),
    getSuggestionsAriaLabel: (fieldName: string, optionCount: number) =>
      i18n.translate('controls.optionsList.popover.suggestionsAriaLabel', {
        defaultMessage:
          'Available {optionCount, plural, one {option} other {options}} for {fieldName}',
        values: { fieldName, optionCount },
      }),
    getAllowExpensiveQueriesWarning: () =>
      i18n.translate('controls.optionsList.popover.allowExpensiveQueriesWarning', {
        defaultMessage:
          'The cluster setting to allow expensive queries is off, so some features are disabled.',
      }),
    getLoadingMoreMessage: () =>
      i18n.translate('controls.optionsList.popover.loadingMore', {
        defaultMessage: 'Loading more options...',
      }),
    getAtEndOfOptionsMessage: () =>
      i18n.translate('controls.optionsList.popover.endOfOptions', {
        defaultMessage:
          'The top 1,000 available options are displayed. View more options by searching for the name.',
      }),
    getEmptyMessage: () =>
      i18n.translate('controls.optionsList.popover.empty', {
        defaultMessage: 'No options found',
      }),
    getSelectionsEmptyMessage: () =>
      i18n.translate('controls.optionsList.popover.selectionsEmpty', {
        defaultMessage: 'You have no selections',
      }),
    getAllOptionsButtonTitle: () =>
      i18n.translate('controls.optionsList.popover.allOptionsTitle', {
        defaultMessage: 'Show all options',
      }),
    getSelectedOptionsButtonTitle: () =>
      i18n.translate('controls.optionsList.popover.selectedOptionsTitle', {
        defaultMessage: 'Show only selected options',
      }),
    getClearAllSelectionsButtonTitle: () =>
      i18n.translate('controls.optionsList.popover.clearAllSelectionsTitle', {
        defaultMessage: 'Clear selections',
      }),
    getSearchPlaceholder: () =>
      i18n.translate('controls.optionsList.popover.searchPlaceholder', {
        defaultMessage: 'Search',
      }),
    getCardinalityLabel: (totalOptions: number) =>
      i18n.translate('controls.optionsList.popover.cardinalityLabel', {
        defaultMessage:
          '{totalOptions, number} {totalOptions, plural, one {option} other {options}}',
        values: { totalOptions },
      }),
    getInvalidSelectionsSectionAriaLabel: (fieldName: string, invalidSelectionCount: number) =>
      i18n.translate('controls.optionsList.popover.invalidSelectionsAriaLabel', {
        defaultMessage:
          'Ignored {invalidSelectionCount, plural, one {selection} other {selections}} for {fieldName}',
        values: { fieldName, invalidSelectionCount },
      }),
    getInvalidSelectionsSectionTitle: (invalidSelectionCount: number) =>
      i18n.translate('controls.optionsList.popover.invalidSelectionsSectionTitle', {
        defaultMessage:
          'Ignored {invalidSelectionCount, plural, one {selection} other {selections}}',
        values: { invalidSelectionCount },
      }),
    getInvalidSelectionsLabel: (selectedOptions: number) =>
      i18n.translate('controls.optionsList.popover.invalidSelectionsLabel', {
        defaultMessage:
          '{selectedOptions} {selectedOptions, plural, one {selection} other {selections}} ignored',
        values: { selectedOptions },
      }),
    getInvalidSelectionScreenReaderText: () =>
      i18n.translate('controls.optionsList.popover.invalidSelectionScreenReaderText', {
        defaultMessage: 'Invalid selection.',
      }),
    getIncludeLabel: () =>
      i18n.translate('controls.optionsList.popover.includeLabel', {
        defaultMessage: 'Include',
      }),
    getExcludeLabel: () =>
      i18n.translate('controls.optionsList.popover.excludeLabel', {
        defaultMessage: 'Exclude',
      }),
    getIncludeExcludeLegend: () =>
      i18n.translate('controls.optionsList.popover.excludeOptionsLegend', {
        defaultMessage: 'Include or exclude selections',
      }),
    getSortPopoverTitle: () =>
      i18n.translate('controls.optionsList.popover.sortTitle', {
        defaultMessage: 'Sort',
      }),
    getSortPopoverDescription: () =>
      i18n.translate('controls.optionsList.popover.sortDescription', {
        defaultMessage: 'Define the sort order',
      }),
    getSortDisabledTooltip: () =>
      i18n.translate('controls.optionsList.popover.sortDisabledTooltip', {
        defaultMessage: 'Sorting is ignored when “Show only selected” is true',
      }),
    getDocumentCountTooltip: (documentCount: number) =>
      i18n.translate('controls.optionsList.popover.documentCountTooltip', {
        defaultMessage:
          'This value appears in {documentCount, number} {documentCount, plural, one {document} other {documents}}',
        values: { documentCount },
      }),
    getDocumentCountScreenReaderText: (documentCount: number) =>
      i18n.translate('controls.optionsList.popover.documentCountScreenReaderText', {
        defaultMessage:
          'Appears in {documentCount, number} {documentCount, plural, one {document} other {documents}}',
        values: { documentCount },
      }),
  },
  controlAndPopover: {
    getExists: (negate: number = +false) =>
      i18n.translate('controls.optionsList.controlAndPopover.exists', {
        defaultMessage: '{negate, plural, one {Exist} other {Exists}}',
        values: { negate },
      }),
  },
  editorAndPopover: {
    getSortDirectionLegend: () =>
      i18n.translate('controls.optionsList.popover.sortDirections', {
        defaultMessage: 'Sort directions',
      }),
    sortBy: {
      _count: {
        getSortByLabel: () =>
          i18n.translate('controls.optionsList.popover.sortBy.docCount', {
            defaultMessage: 'By document count',
          }),
      },
      _key: {
        getSortByLabel: () =>
          i18n.translate('controls.optionsList.popover.sortBy.alphabetical', {
            defaultMessage: 'Alphabetically',
          }),
      },
    },
    sortOrder: {
      asc: {
        getSortOrderLabel: () =>
          i18n.translate('controls.optionsList.popover.sortOrder.asc', {
            defaultMessage: 'Ascending',
          }),
      },
      desc: {
        getSortOrderLabel: () =>
          i18n.translate('controls.optionsList.popover.sortOrder.desc', {
            defaultMessage: 'Descending',
          }),
      },
    },
  },
};
