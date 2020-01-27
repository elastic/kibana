/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

interface EuiValues {
  [key: string]: any;
}

export const euiContextMapping = {
  'euiBasicTable.selectAllRows': i18n.translate('core.euiBasicTable.selectAllRows', {
    defaultMessage: 'Select all rows',
    description: 'ARIA and displayed label on a checkbox to select all table rows',
  }),
  'euiBasicTable.selectThisRow': i18n.translate('core.euiBasicTable.selectThisRow', {
    defaultMessage: 'Select this row',
    description: 'ARIA and displayed label on a checkbox to select a single table row',
  }),
  'euiBasicTable.tableDescription': ({ itemCount }: EuiValues) =>
    i18n.translate('core.euiBasicTable.tableDescription', {
      defaultMessage: 'Below is a table of {itemCount} items.',
      values: { itemCount },
      description: 'Screen reader text to describe the size of a table',
    }),
  'euiBottomBar.screenReaderAnnouncement': i18n.translate(
    'core.euiBottomBar.screenReaderAnnouncement',
    {
      defaultMessage:
        'There is a new menu opening with page level controls at the end of the document.',
      description:
        'Screen reader announcement that functionality is available in the page document',
    }
  ),
  'euiBreadcrumbs.collapsedBadge.ariaLabel': i18n.translate(
    'core.euiBreadcrumbs.collapsedBadge.ariaLabel',
    {
      defaultMessage: 'Show all breadcrumbs',
      description: 'Displayed when one or more breadcrumbs are hidden.',
    }
  ),
  'euiCardSelect.select': i18n.translate('core.euiCardSelect.select', {
    defaultMessage: 'Select',
    description: 'Displayed button text when a card option can be selected.',
  }),
  'euiCardSelect.selected': i18n.translate('core.euiCardSelect.selected', {
    defaultMessage: 'Selected',
    description: 'Displayed button text when a card option is selected.',
  }),
  'euiCardSelect.unavailable': i18n.translate('core.euiCardSelect.unavailable', {
    defaultMessage: 'Unavailable',
    description: 'Displayed button text when a card option is unavailable.',
  }),
  'euiCodeBlock.copyButton': i18n.translate('core.euiCodeBlock.copyButton', {
    defaultMessage: 'Copy',
    description: 'ARIA label for a button that copies source code text to the clipboard',
  }),
  'euiCodeEditor.startEditing': i18n.translate('core.euiCodeEditor.startEditing', {
    defaultMessage: 'Press Enter to start editing.',
  }),
  'euiCodeEditor.startInteracting': i18n.translate('core.euiCodeEditor.startInteracting', {
    defaultMessage: 'Press Enter to start interacting with the code.',
  }),
  'euiCodeEditor.stopEditing': i18n.translate('core.euiCodeEditor.stopEditing', {
    defaultMessage: "When you're done, press Escape to stop editing.",
  }),
  'euiCodeEditor.stopInteracting': i18n.translate('core.euiCodeEditor.stopInteracting', {
    defaultMessage: "When you're done, press Escape to stop interacting with the code.",
  }),
  'euiCollapsedItemActions.allActions': i18n.translate('core.euiCollapsedItemActions.allActions', {
    defaultMessage: 'All actions',
    description: 'ARIA label and tooltip content describing a button that expands an actions menu',
  }),
  'euiColorPicker.screenReaderAnnouncement': i18n.translate(
    'core.euiColorPicker.screenReaderAnnouncement',
    {
      defaultMessage:
        'A popup with a range of selectable colors opened. Tab forward to cycle through colors choices or press escape to close this popup.',
      description:
        'Message when the color picker popover is opened. Describes the interaction with the elements in the popover.',
    }
  ),
  'euiColorPicker.swatchAriaLabel': ({ swatch }: EuiValues) =>
    i18n.translate('core.euiColorPicker.swatchAriaLabel', {
      defaultMessage: 'Select {swatch} as the color',
      values: { swatch },
      description:
        'Screen reader text to describe the action and hex value of the selectable option',
    }),
  'euiColorStopThumb.removeLabel': i18n.translate('core.euiColorStopThumb.removeLabel', {
    defaultMessage: 'Remove this stop',
    description: 'Label accompanying a button whose action will remove the color stop',
  }),
  'euiColorStopThumb.screenReaderAnnouncement': i18n.translate(
    'core.euiColorStopThumb.screenReaderAnnouncement',
    {
      defaultMessage:
        'A popup with a color stop edit form opened. Tab forward to cycle through form controls or press escape to close this popup.',
      description:
        'Message when the color picker popover has opened for an individual color stop thumb.',
    }
  ),
  'euiColorStops.screenReaderAnnouncement': ({ label, readOnly, disabled }: EuiValues) =>
    i18n.translate('core.euiColorStops.screenReaderAnnouncement', {
      defaultMessage:
        '{label}: {readOnly} {disabled} Color stop picker. Each stop consists of a number and corresponding color value. Use the Down and Up arrow keys to select individual stops. Press the Enter key to create a new stop.',
      values: { label, readOnly, disabled },
      description:
        'Screen reader text to describe the composite behavior of the color stops component.',
    }),
  'euiColumnSelector.hideAll': i18n.translate('core.euiColumnSelector.hideAll', {
    defaultMessage: 'Hide all',
  }),
  'euiColumnSelector.selectAll': i18n.translate('core.euiColumnSelector.selectAll', {
    defaultMessage: 'Show all',
  }),
  'euiColumnSorting.clearAll': i18n.translate('core.euiColumnSorting.clearAll', {
    defaultMessage: 'Clear sorting',
  }),
  'euiColumnSorting.emptySorting': i18n.translate('core.euiColumnSorting.emptySorting', {
    defaultMessage: 'Currently no fields are sorted',
  }),
  'euiColumnSorting.pickFields': i18n.translate('core.euiColumnSorting.pickFields', {
    defaultMessage: 'Pick fields to sort by',
  }),
  'euiColumnSorting.sortFieldAriaLabel': i18n.translate(
    'core.euiColumnSorting.sortFieldAriaLabel',
    {
      defaultMessage: 'Sort by:',
    }
  ),
  'euiColumnSortingDraggable.activeSortLabel': i18n.translate(
    'core.euiColumnSortingDraggable.activeSortLabel',
    {
      defaultMessage: 'is sorting this data grid',
    }
  ),
  'euiColumnSortingDraggable.defaultSortAsc': i18n.translate(
    'core.euiColumnSortingDraggable.defaultSortAsc',
    {
      defaultMessage: 'A-Z',
      description: 'Ascending sort label',
    }
  ),
  'euiColumnSortingDraggable.defaultSortDesc': i18n.translate(
    'core.euiColumnSortingDraggable.defaultSortDesc',
    {
      defaultMessage: 'Z-A',
      description: 'Descending sort label',
    }
  ),
  'euiColumnSortingDraggable.removeSortLabel': i18n.translate(
    'core.euiColumnSortingDraggable.removeSortLabel',
    {
      defaultMessage: 'Remove from data grid sort:',
    }
  ),
  'euiColumnSortingDraggable.toggleLegend': i18n.translate(
    'core.euiColumnSortingDraggable.toggleLegend',
    {
      defaultMessage: 'Select sorting method for field:',
    }
  ),
  'euiComboBoxOptionsList.allOptionsSelected': i18n.translate(
    'core.euiComboBoxOptionsList.allOptionsSelected',
    {
      defaultMessage: "You've selected all available options",
    }
  ),
  'euiComboBoxOptionsList.alreadyAdded': ({ label }: EuiValues) => (
    <FormattedMessage
      id="core.euiComboBoxOptionsList.alreadyAdded"
      defaultMessage="{label} has already been added"
      values={{ label }}
    />
  ),
  'euiComboBoxOptionsList.createCustomOption': ({ key, searchValue }: EuiValues) => (
    <FormattedMessage
      id="core.euiComboBoxOptionsList.createCustomOption"
      defaultMessage="Hit {key} to add {searchValue} as a custom option"
      values={{ key, searchValue }}
    />
  ),
  'euiComboBoxOptionsList.loadingOptions': i18n.translate(
    'core.euiComboBoxOptionsList.loadingOptions',
    {
      defaultMessage: 'Loading options',
      description: 'Placeholder message while data is asynchronously loaded',
    }
  ),
  'euiComboBoxOptionsList.noAvailableOptions': i18n.translate(
    'core.euiComboBoxOptionsList.noAvailableOptions',
    {
      defaultMessage: "There aren't any options available",
    }
  ),
  'euiComboBoxOptionsList.noMatchingOptions': ({ searchValue }: EuiValues) => (
    <FormattedMessage
      id="core.euiComboBoxOptionsList.noMatchingOptions"
      defaultMessage="{searchValue} doesn't match any options"
      values={{ searchValue }}
    />
  ),
  'euiComboBoxPill.removeSelection': ({ children }: EuiValues) =>
    i18n.translate('core.euiComboBoxPill.removeSelection', {
      defaultMessage: 'Remove {children} from selection in this group',
      values: { children },
      description: 'ARIA label, `children` is the human-friendly value of an option',
    }),
  'euiCommonlyUsedTimeRanges.legend': i18n.translate('core.euiCommonlyUsedTimeRanges.legend', {
    defaultMessage: 'Commonly used',
  }),
  'euiDataGrid.screenReaderNotice': i18n.translate('core.euiDataGrid.screenReaderNotice', {
    defaultMessage: 'Cell contains interactive content.',
  }),
  'euiDataGridCell.expandButtonTitle': i18n.translate('core.euiDataGridCell.expandButtonTitle', {
    defaultMessage: 'Click or hit enter to interact with cell content',
  }),
  'euiDataGridSchema.booleanSortTextAsc': i18n.translate(
    'core.euiDataGridSchema.booleanSortTextAsc',
    {
      defaultMessage: 'True-False',
      description: 'Ascending boolean label',
    }
  ),
  'euiDataGridSchema.booleanSortTextDesc': i18n.translate(
    'core.euiDataGridSchema.booleanSortTextDesc',
    {
      defaultMessage: 'False-True',
      description: 'Descending boolean label',
    }
  ),
  'euiDataGridSchema.currencySortTextAsc': i18n.translate(
    'core.euiDataGridSchema.currencySortTextAsc',
    {
      defaultMessage: 'Low-High',
      description: 'Ascending currency label',
    }
  ),
  'euiDataGridSchema.currencySortTextDesc': i18n.translate(
    'core.euiDataGridSchema.currencySortTextDesc',
    {
      defaultMessage: 'High-Low',
      description: 'Descending currency label',
    }
  ),
  'euiDataGridSchema.dateSortTextAsc': i18n.translate('core.euiDataGridSchema.dateSortTextAsc', {
    defaultMessage: 'New-Old',
    description: 'Ascending date label',
  }),
  'euiDataGridSchema.dateSortTextDesc': i18n.translate('core.euiDataGridSchema.dateSortTextDesc', {
    defaultMessage: 'Old-New',
    description: 'Descending date label',
  }),
  'euiDataGridSchema.numberSortTextAsc': i18n.translate(
    'core.euiDataGridSchema.numberSortTextAsc',
    {
      defaultMessage: 'Low-High',
      description: 'Ascending number label',
    }
  ),
  'euiDataGridSchema.numberSortTextDesc': i18n.translate(
    'core.euiDataGridSchema.numberSortTextDesc',
    {
      defaultMessage: 'High-Low',
      description: 'Descending number label',
    }
  ),
  'euiDataGridSchema.jsonSortTextAsc': i18n.translate('core.euiDataGridSchema.jsonSortTextAsc', {
    defaultMessage: 'Small-Large',
    description: 'Ascending size label',
  }),
  'euiDataGridSchema.jsonSortTextDesc': i18n.translate('core.euiDataGridSchema.jsonSortTextDesc', {
    defaultMessage: 'Large-Small',
    description: 'Descending size label',
  }),
  'euiFilterButton.filterBadge': ({ count, hasActiveFilters }: EuiValues) =>
    i18n.translate('core.euiFilterButton.filterBadge', {
      defaultMessage: '${count} ${filterCountLabel} filters',
      values: { count, filterCountLabel: hasActiveFilters ? 'active' : 'available' },
    }),
  'euiForm.addressFormErrors': i18n.translate('core.euiForm.addressFormErrors', {
    defaultMessage: 'Please address the errors in your form.',
  }),
  'euiFormControlLayoutClearButton.label': i18n.translate(
    'core.euiFormControlLayoutClearButton.label',
    {
      defaultMessage: 'Clear input',
      description: 'ARIA label on a button that removes any entry in a form field',
    }
  ),
  'euiHeaderAlert.dismiss': i18n.translate('core.euiHeaderAlert.dismiss', {
    defaultMessage: 'Dismiss',
    description: 'ARIA label on a button that dismisses/removes a notification',
  }),
  'euiHeaderLinks.appNavigation': i18n.translate('core.euiHeaderLinks.appNavigation', {
    defaultMessage: 'App navigation',
    description: 'ARIA label on a `nav` element',
  }),
  'euiHeaderLinks.openNavigationMenu': i18n.translate('core.euiHeaderLinks.openNavigationMenu', {
    defaultMessage: 'Open navigation menu',
  }),
  'euiHue.label': i18n.translate('core.euiHue.label', {
    defaultMessage: 'Select the HSV color mode "hue" value',
  }),
  'euiImage.closeImage': ({ alt }: EuiValues) =>
    i18n.translate('core.euiImage.closeImage', {
      defaultMessage: 'Close full screen {alt} image',
      values: { alt },
    }),
  'euiImage.openImage': ({ alt }: EuiValues) =>
    i18n.translate('core.euiImage.openImage', {
      defaultMessage: 'Open full screen {alt} image',
      values: { alt },
    }),
  'euiLink.external.ariaLabel': i18n.translate('core.euiLink.external.ariaLabel', {
    defaultMessage: 'External link',
  }),
  'euiModal.closeModal': i18n.translate('core.euiModal.closeModal', {
    defaultMessage: 'Closes this modal window',
  }),
  'euiPagination.jumpToLastPage': ({ pageCount }: EuiValues) =>
    i18n.translate('core.euiPagination.jumpToLastPage', {
      defaultMessage: 'Jump to the last page, number {pageCount}',
      values: { pageCount },
    }),
  'euiPagination.nextPage': i18n.translate('core.euiPagination.nextPage', {
    defaultMessage: 'Next page',
  }),
  'euiPagination.pageOfTotal': ({ page, total }: EuiValues) =>
    i18n.translate('core.euiPagination.pageOfTotal', {
      defaultMessage: 'Page {page} of {total}',
      values: { page, total },
    }),
  'euiPagination.previousPage': i18n.translate('core.euiPagination.previousPage', {
    defaultMessage: 'Previous page',
  }),
  'euiPopover.screenReaderAnnouncement': i18n.translate(
    'core.euiPopover.screenReaderAnnouncement',
    {
      defaultMessage: 'You are in a dialog. To close this dialog, hit escape.',
    }
  ),
  'euiQuickSelect.applyButton': i18n.translate('core.euiQuickSelect.applyButton', {
    defaultMessage: 'Apply',
  }),
  'euiQuickSelect.fullDescription': ({ timeTense, timeValue, timeUnit }: EuiValues) =>
    i18n.translate('core.euiQuickSelect.fullDescription', {
      defaultMessage: 'Currently set to {timeTense} {timeValue} {timeUnit}.',
      values: { timeTense, timeValue, timeUnit },
    }),
  'euiQuickSelect.legendText': i18n.translate('core.euiQuickSelect.legendText', {
    defaultMessage: 'Quick select a time range',
  }),
  'euiQuickSelect.nextLabel': i18n.translate('core.euiQuickSelect.nextLabel', {
    defaultMessage: 'Next time window',
  }),
  'euiQuickSelect.previousLabel': i18n.translate('core.euiQuickSelect.previousLabel', {
    defaultMessage: 'Previous time window',
  }),
  'euiQuickSelect.quickSelectTitle': i18n.translate('core.euiQuickSelect.quickSelectTitle', {
    defaultMessage: 'Quick select',
  }),
  'euiQuickSelect.tenseLabel': i18n.translate('core.euiQuickSelect.tenseLabel', {
    defaultMessage: 'Time tense',
  }),
  'euiQuickSelect.unitLabel': i18n.translate('core.euiQuickSelect.unitLabel', {
    defaultMessage: 'Time unit',
  }),
  'euiQuickSelect.valueLabel': i18n.translate('core.euiQuickSelect.valueLabel', {
    defaultMessage: 'Time value',
  }),
  'euiRefreshInterval.fullDescription': ({ optionValue, optionText }: EuiValues) =>
    i18n.translate('core.euiRefreshInterval.fullDescription', {
      defaultMessage: 'Currently set to {optionValue} {optionText}.',
      values: { optionValue, optionText },
    }),
  'euiRefreshInterval.legend': i18n.translate('core.euiRefreshInterval.legend', {
    defaultMessage: 'Refresh every',
  }),
  'euiRefreshInterval.start': i18n.translate('core.euiRefreshInterval.start', {
    defaultMessage: 'Start',
  }),
  'euiRefreshInterval.stop': i18n.translate('core.euiRefreshInterval.stop', {
    defaultMessage: 'Stop',
  }),
  'euiRelativeTab.fullDescription': ({ unit }: EuiValues) =>
    i18n.translate('core.euiRelativeTab.fullDescription', {
      defaultMessage: 'The unit is changeable. Currently set to {unit}.',
      values: { unit },
    }),
  'euiRelativeTab.relativeDate': ({ position }: EuiValues) =>
    i18n.translate('core.euiRelativeTab.relativeDate', {
      defaultMessage: '{position} date',
      values: { position },
    }),
  'euiRelativeTab.roundingLabel': ({ unit }: EuiValues) =>
    i18n.translate('core.euiRelativeTab.roundingLabel', {
      defaultMessage: 'Round to the {unit}',
      values: { unit },
    }),
  'euiRelativeTab.unitInputLabel': i18n.translate('core.euiRelativeTab.unitInputLabel', {
    defaultMessage: 'Relative time span',
  }),
  'euiSaturation.roleDescription': i18n.translate('core.euiSaturation.roleDescription', {
    defaultMessage: 'HSV color mode saturation and value selection',
  }),
  'euiSaturation.screenReaderAnnouncement': i18n.translate(
    'core.euiSaturation.screenReaderAnnouncement',
    {
      defaultMessage:
        'Use the arrow keys to navigate the square color gradient. The coordinates resulting from each key press will be used to calculate HSV color mode "saturation" and "value" numbers, in the range of 0 to 1. Left and right decrease and increase (respectively) the "saturation" value. Up and down decrease and increase (respectively) the "value" value.',
    }
  ),
  'euiSelectable.loadingOptions': i18n.translate('core.euiSelectable.loadingOptions', {
    defaultMessage: 'Loading options',
    description: 'Placeholder message while data is asynchronously loaded',
  }),
  'euiSelectable.noAvailableOptions': i18n.translate('core.euiSelectable.noAvailableOptions', {
    defaultMessage: "There aren't any options available",
  }),
  'euiSelectable.noMatchingOptions': ({ searchValue }: EuiValues) => (
    <FormattedMessage
      id="core.euiSelectable.noMatchingOptions"
      defaultMessage="{searchValue} doesn't match any options"
      values={{ searchValue }}
    />
  ),
  'euiStat.loadingText': i18n.translate('core.euiStat.loadingText', {
    defaultMessage: 'Statistic is loading',
  }),
  'euiStep.ariaLabel': ({ status }: EuiValues) =>
    i18n.translate('core.euiStep.ariaLabel', {
      defaultMessage: '{stepStatus}',
      values: { stepStatus: status === 'incomplete' ? 'Incomplete Step' : 'Step' },
    }),
  'euiStepHorizontal.buttonTitle': ({ step, title, disabled, isComplete }: EuiValues) => {
    return i18n.translate('core.euiStepHorizontal.buttonTitle', {
      defaultMessage: 'Step {step}: {title}{titleAppendix}',
      values: {
        step,
        title,
        titleAppendix: disabled ? ' is disabled' : isComplete ? ' is complete' : '',
      },
    });
  },
  'euiStepHorizontal.step': i18n.translate('core.euiStepHorizontal.step', {
    defaultMessage: 'Step',
    description: 'Screen reader text announcing information about a step in some process',
  }),
  'euiStepNumber.hasErrors': i18n.translate('core.euiStepNumber.hasErrors', {
    defaultMessage: 'has errors',
    description:
      'Used as the title attribute on an image or svg icon to indicate a given process step has errors',
  }),
  'euiStepNumber.hasWarnings': i18n.translate('core.euiStepNumber.hasWarnings', {
    defaultMessage: 'has warnings',
    description:
      'Used as the title attribute on an image or svg icon to indicate a given process step has warnings',
  }),
  'euiStepNumber.isComplete': i18n.translate('core.euiStepNumber.isComplete', {
    defaultMessage: 'complete',
    description:
      'Used as the title attribute on an image or svg icon to indicate a given process step is complete',
  }),
  'euiStyleSelector.buttonText': i18n.translate('core.euiStyleSelector.buttonText', {
    defaultMessage: 'Density',
  }),
  'euiSuperDatePicker.showDatesButtonLabel': i18n.translate(
    'core.euiSuperDatePicker.showDatesButtonLabel',
    {
      defaultMessage: 'Show dates',
      description: 'Displayed in a button that shows date picker',
    }
  ),
  'euiSuperSelect.screenReaderAnnouncement': ({ optionsCount }: EuiValues) =>
    i18n.translate('core.euiSuperSelect.screenReaderAnnouncement', {
      defaultMessage:
        'You are in a form selector of {optionsCount} items and must select a single option. Use the Up and Down keys to navigate or Escape to close.',
      values: { optionsCount },
    }),
  'euiSuperSelectControl.selectAnOption': ({ selectedValue }: EuiValues) =>
    i18n.translate('core.euiSuperSelectControl.selectAnOption', {
      defaultMessage: 'Select an option: {selectedValue}, is selected',
      values: { selectedValue },
    }),
  'euiSuperUpdateButton.cannotUpdateTooltip': i18n.translate(
    'core.euiSuperUpdateButton.cannotUpdateTooltip',
    {
      defaultMessage: 'Cannot update',
      description: "Displayed in a tooltip when updates can't happen",
    }
  ),
  'euiSuperUpdateButton.clickToApplyTooltip': i18n.translate(
    'core.euiSuperUpdateButton.clickToApplyTooltip',
    {
      defaultMessage: 'Click to apply',
      description: "Displayed in a tooltip when there are changes that haven't been applied",
    }
  ),
  'euiSuperUpdateButton.refreshButtonLabel': i18n.translate(
    'core.euiSuperUpdateButton.refreshButtonLabel',
    {
      defaultMessage: 'Refresh',
      description: 'Displayed in a button that refreshes based on date picked',
    }
  ),
  'euiSuperUpdateButton.updatingButtonLabel': i18n.translate(
    'core.euiSuperUpdateButton.updatingButtonLabel',
    {
      defaultMessage: 'Updating',
      description: 'Displayed in a button that refreshes when updates are happening',
    }
  ),
  'euiSuperUpdateButton.updateButtonLabel': i18n.translate(
    'core.euiSuperUpdateButton.updateButtonLabel',
    {
      defaultMessage: 'Update',
      description: 'Displayed in a button that updates based on date picked',
    }
  ),
  'euiTablePagination.rowsPerPage': i18n.translate('core.euiTablePagination.rowsPerPage', {
    defaultMessage: 'Rows per page',
    description: 'Displayed in a button that toggles a table pagination menu',
  }),
  'euiTablePagination.rowsPerPageOption': ({ rowsPerPage }: EuiValues) =>
    i18n.translate('core.euiTablePagination.rowsPerPageOption', {
      defaultMessage: '{rowsPerPage} rows',
      description: 'Displayed in a button that toggles the number of visible rows',
      values: { rowsPerPage },
    }),
  'euiTableSortMobile.sorting': i18n.translate('core.euiTableSortMobile.sorting', {
    defaultMessage: 'Sorting',
    description: 'Displayed in a button that toggles a table sorting menu',
  }),
  'euiToast.dismissToast': i18n.translate('core.euiToast.dismissToast', {
    defaultMessage: 'Dismiss toast',
  }),
  'euiToast.newNotification': i18n.translate('core.euiToast.newNotification', {
    defaultMessage: 'A new notification appears',
  }),
  'euiToast.notification': i18n.translate('core.euiToast.notification', {
    defaultMessage: 'Notification',
    description: 'ARIA label on an element containing a notification',
  }),
  'euiTreeView.ariaLabel': ({ nodeLabel, ariaLabel }: EuiValues) =>
    i18n.translate('core.euiTreeView.ariaLabel', {
      defaultMessage: '{nodeLabel} child of {ariaLabel}',
      values: { nodeLabel, ariaLabel },
    }),
  'euiTreeView.listNavigationInstructions': i18n.translate(
    'core.euiTreeView.listNavigationInstructions',
    {
      defaultMessage: 'You can quickly navigate this list using arrow keys.',
    }
  ),
};
