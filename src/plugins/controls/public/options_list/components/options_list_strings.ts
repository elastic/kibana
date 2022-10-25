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
    getHideExcludeTitle: () =>
      i18n.translate('controls.optionsList.editor.hideExclude', {
        defaultMessage: 'Allow selections to be excluded',
      }),
  },
  popover: {
    getLoadingMessage: () =>
      i18n.translate('controls.optionsList.popover.loading', {
        defaultMessage: 'Loading options',
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
    getTotalCardinalityTooltip: (totalOptions: number) =>
      i18n.translate('controls.optionsList.popover.cardinalityTooltip', {
        defaultMessage: '{totalOptions} available options.',
        values: { totalOptions },
      }),
    getTotalCardinalityPlaceholder: (totalOptions: number) =>
      i18n.translate('controls.optionsList.popover.cardinalityPlaceholder', {
        defaultMessage:
          'Search {totalOptions} available {totalOptions, plural, one {option} other {options}}',
        values: { totalOptions },
      }),
    getInvalidSelectionsTitle: (invalidSelectionCount: number) =>
      i18n.translate('controls.optionsList.popover.invalidSelectionsTitle', {
        defaultMessage: '{invalidSelectionCount} selected options ignored',
        values: { invalidSelectionCount },
      }),
    getInvalidSelectionsSectionTitle: (invalidSelectionCount: number) =>
      i18n.translate('controls.optionsList.popover.invalidSelectionsSectionTitle', {
        defaultMessage:
          'Ignored {invalidSelectionCount, plural, one {selection} other {selections}}',
        values: { invalidSelectionCount },
      }),
    getInvalidSelectionsAriaLabel: () =>
      i18n.translate('controls.optionsList.popover.invalidSelectionsAriaLabel', {
        defaultMessage: 'Deselect all ignored selections',
      }),
    getInvalidSelectionsTooltip: (selectedOptions: number) =>
      i18n.translate('controls.optionsList.popover.invalidSelectionsTooltip', {
        defaultMessage:
          '{selectedOptions} selected {selectedOptions, plural, one {option} other {options}} {selectedOptions, plural, one {is} other {are}} ignored because {selectedOptions, plural, one {it is} other {they are}} no longer in the data.',
        values: { selectedOptions },
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
  },
  controlAndPopover: {
    getExists: () =>
      i18n.translate('controls.optionsList.controlAndPopover.exists', {
        defaultMessage: 'Exists (*)',
      }),
    getNegateExists: () =>
      i18n.translate('controls.optionsList.controlAndPopover.negateExists', {
        defaultMessage: 'Does not exist (!)',
      }),
  },
};
