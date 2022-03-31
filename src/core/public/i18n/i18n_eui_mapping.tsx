/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiTokensObject } from '@elastic/eui';

interface EuiValues {
  [key: string]: any;
}

export const getEuiContextMapping = (): EuiTokensObject => {
  return {
    'euiAccordion.isLoading': i18n.translate('core.euiAccordion.isLoading', {
      defaultMessage: 'Loading',
    }),
    'euiAutoRefresh.autoRefreshLabel': i18n.translate('core.euiAutoRefresh.autoRefreshLabel', {
      defaultMessage: 'Auto refresh',
    }),
    'euiAutoRefresh.buttonLabelOff': i18n.translate('core.euiAutoRefresh.buttonLabelOff', {
      defaultMessage: 'Auto refresh is off',
    }),
    'euiAutoRefresh.buttonLabelOn': ({ prettyInterval }: EuiValues) =>
      i18n.translate('core.euiAutoRefresh.buttonLabelOn', {
        defaultMessage: 'Auto refresh is on and set to {prettyInterval}',
        values: { prettyInterval },
      }),
    'euiBasicTable.selectAllRows': i18n.translate('core.euiBasicTable.selectAllRows', {
      defaultMessage: 'Select all rows',
      description: 'ARIA and displayed label on a checkbox to select all table rows',
    }),
    'euiBasicTable.selectThisRow': i18n.translate('core.euiBasicTable.selectThisRow', {
      defaultMessage: 'Select this row',
      description: 'ARIA and displayed label on a checkbox to select a single table row',
    }),
    'euiBasicTable.tableCaptionWithPagination': ({ tableCaption, page, pageCount }: EuiValues) =>
      i18n.translate('core.euiBasicTable.tableCaptionWithPagination', {
        defaultMessage: '{tableCaption}; Page {page} of {pageCount}.',
        values: { tableCaption, page, pageCount },
        description: 'Screen reader text to describe the size of a paginated table',
      }),
    'euiBasicTable.tableAutoCaptionWithPagination': ({
      itemCount,
      totalItemCount,
      page,
      pageCount,
    }: EuiValues) =>
      i18n.translate('core.euiBasicTable.tableAutoCaptionWithPagination', {
        defaultMessage:
          'This table contains {itemCount} rows out of {totalItemCount} rows; Page {page} of {pageCount}.',
        values: { itemCount, totalItemCount, page, pageCount },
        description: 'Screen reader text to describe the size of a paginated table',
      }),
    'euiBasicTable.tableSimpleAutoCaptionWithPagination': ({
      itemCount,
      page,
      pageCount,
    }: EuiValues) =>
      i18n.translate('core.euiBasicTable.tableSimpleAutoCaptionWithPagination', {
        defaultMessage: 'This table contains {itemCount} rows; Page {page} of {pageCount}.',
        values: { itemCount, page, pageCount },
        description: 'Screen reader text to describe the size of a paginated table',
      }),
    'euiBasicTable.tableAutoCaptionWithoutPagination': ({ itemCount }: EuiValues) =>
      i18n.translate('core.euiBasicTable.tableAutoCaptionWithoutPagination', {
        defaultMessage: 'This table contains {itemCount} rows.',
        values: { itemCount },
        description: 'Screen reader text to describe the size of a table',
      }),
    'euiBasicTable.tablePagination': ({ tableCaption }: EuiValues) =>
      i18n.translate('core.euiBasicTable.tablePagination', {
        defaultMessage: 'Pagination for table: {tableCaption}',
        values: { tableCaption },
        description: 'Screen reader text to describe the pagination controls',
      }),
    'euiBasicTable.noItemsMessage': i18n.translate('core.euiBasicTable.noItemsMessage', {
      defaultMessage: 'No items found',
    }),
    'euiBottomBar.customScreenReaderAnnouncement': ({ landmarkHeading }: EuiValues) =>
      i18n.translate('core.euiBottomBar.customScreenReaderAnnouncement', {
        defaultMessage:
          'There is a new region landmark called {landmarkHeading} with page level controls at the end of the document.',
        values: { landmarkHeading },
        description:
          'Screen reader announcement that functionality is available in the page document',
      }),
    'euiBottomBar.screenReaderAnnouncement': i18n.translate(
      'core.euiBottomBar.screenReaderAnnouncement',
      {
        defaultMessage:
          'There is a new region landmark with page level controls at the end of the document.',
        description:
          'Screen reader announcement that functionality is available in the page document',
      }
    ),
    'euiBottomBar.screenReaderHeading': i18n.translate('core.euiBottomBar.screenReaderHeading', {
      defaultMessage: 'Page level controls',
      description: 'Screen reader announcement about heading controls',
    }),
    'euiBreadcrumbs.collapsedBadge.ariaLabel': i18n.translate(
      'core.euiBreadcrumbs.collapsedBadge.ariaLabel',
      {
        defaultMessage: 'See collapsed breadcrumbs',
        description: 'Displayed when one or more breadcrumbs are hidden.',
      }
    ),
    'euiBreadcrumbs.nav.ariaLabel': i18n.translate('core.euiBreadcrumbs.nav.ariaLabel', {
      defaultMessage: 'Breadcrumbs',
      description: 'Label on the breadcrumbs nav element',
    }),
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
    'euiCodeBlock.fullscreenCollapse': i18n.translate('core.euiCodeBlock.fullscreenCollapse', {
      defaultMessage: 'Collapse',
      description: 'ARIA label for a button that exits fullscreen view',
    }),
    'euiCodeBlock.fullscreenExpand': i18n.translate('core.euiCodeBlock.fullscreenExpand', {
      defaultMessage: 'Expand',
      description: 'ARIA label for a button that enters fullscreen view',
    }),
    'euiCollapsedItemActions.allActions': i18n.translate(
      'core.euiCollapsedItemActions.allActions',
      {
        defaultMessage: 'All actions',
        description:
          'ARIA label and tooltip content describing a button that expands an actions menu',
      }
    ),
    'euiColorPicker.alphaLabel': i18n.translate('core.euiColorPicker.alphaLabel', {
      defaultMessage: 'Alpha channel (opacity) value',
      description: 'Label describing color alpha channel',
    }),
    'euiColorPicker.colorLabel': i18n.translate('core.euiColorPicker.colorLabel', {
      defaultMessage: 'Color value',
    }),
    'euiColorPicker.colorErrorMessage': i18n.translate('core.euiColorPicker.colorErrorMessage', {
      defaultMessage: 'Invalid color value',
    }),
    'euiColorPicker.transparent': i18n.translate('core.euiColorPicker.transparent', {
      defaultMessage: 'Transparent',
    }),
    'euiColorPicker.openLabel': i18n.translate('core.euiColorPicker.openLabel', {
      defaultMessage: 'Press the escape key to close the popover',
      description: 'Screen reader text to describe how to close the picker',
    }),
    'euiColorPicker.closeLabel': i18n.translate('core.euiColorPicker.closeLabel', {
      defaultMessage: 'Press the down key to open a popover containing color options',
      description: 'Screen reader text to describe how to open the picker',
    }),
    'euiColorPicker.popoverLabel': i18n.translate('core.euiColorPicker.popoverLabel', {
      defaultMessage: 'Color selection dialog',
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
    'euiColorStopThumb.buttonAriaLabel': i18n.translate('core.euiColorStopThumb.buttonAriaLabel', {
      defaultMessage: 'Press the Enter key to modify this stop. Press Escape to focus the group',
      description: 'Screen reader text to describe picker interaction',
    }),
    'euiColorStopThumb.buttonTitle': i18n.translate('core.euiColorStopThumb.buttonTitle', {
      defaultMessage: 'Click to edit, drag to reposition',
      description: 'Screen reader text to describe button interaction',
    }),
    'euiColorStopThumb.stopLabel': i18n.translate('core.euiColorStopThumb.stopLabel', {
      defaultMessage: 'Stop value',
    }),
    'euiColorStopThumb.stopErrorMessage': i18n.translate(
      'core.euiColorStopThumb.stopErrorMessage',
      {
        defaultMessage: 'Value is out of range',
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
    'euiColorPickerSwatch.ariaLabel': ({ color }: EuiValues) =>
      i18n.translate('core.euiColorPickerSwatch.ariaLabel', {
        defaultMessage: 'Select {color} as the color',
        values: { color },
      }),
    'euiColumnActions.hideColumn': i18n.translate('core.euiColumnActions.hideColumn', {
      defaultMessage: 'Hide column',
    }),
    'euiColumnActions.sort': ({ schemaLabel }: EuiValues) => (
      <FormattedMessage
        id="core.euiColumnActions.sort"
        defaultMessage="Sort {schemaLabel}"
        values={{ schemaLabel }}
      />
    ),
    'euiColumnActions.moveLeft': i18n.translate('core.euiColumnActions.moveLeft', {
      defaultMessage: 'Move left',
    }),
    'euiColumnActions.moveRight': i18n.translate('core.euiColumnActions.moveRight', {
      defaultMessage: 'Move right',
    }),
    'euiColumnSelector.hideAll': i18n.translate('core.euiColumnSelector.hideAll', {
      defaultMessage: 'Hide all',
    }),
    'euiColumnSelector.selectAll': i18n.translate('core.euiColumnSelector.selectAll', {
      defaultMessage: 'Show all',
    }),
    'euiColumnSelector.button': i18n.translate('core.euiColumnSelector.button', {
      defaultMessage: 'Columns',
    }),
    'euiColumnSelector.search': i18n.translate('core.euiColumnSelector.search', {
      defaultMessage: 'Search',
    }),
    'euiColumnSelector.searchcolumns': i18n.translate('core.euiColumnSelector.searchcolumns', {
      defaultMessage: 'Search columns',
    }),
    'euiColumnSelector.buttonActiveSingular': ({ numberOfHiddenFields }: EuiValues) =>
      i18n.translate('core.euiColumnSelector.buttonActiveSingular', {
        defaultMessage: '{numberOfHiddenFields} column hidden',
        values: { numberOfHiddenFields },
      }),
    'euiColumnSelector.buttonActivePlural': ({ numberOfHiddenFields }: EuiValues) =>
      i18n.translate('core.euiColumnSelector.buttonActivePlural', {
        defaultMessage: '{numberOfHiddenFields} columns hidden',
        values: { numberOfHiddenFields },
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
    'euiColumnSorting.button': i18n.translate('core.euiColumnSorting.button', {
      defaultMessage: 'Sort fields',
    }),
    'euiColumnSorting.buttonActive': ({ numberOfSortedFields }: EuiValues) =>
      i18n.translate('core.euiColumnSorting.buttonActive', {
        defaultMessage: '{numberOfSortedFields, plural, one {# field} other {# fields}} sorted',
        values: { numberOfSortedFields },
      }),
    'euiColumnSortingDraggable.activeSortLabel': ({ display }: EuiValues) =>
      i18n.translate('core.euiColumnSortingDraggable.activeSortLabel', {
        defaultMessage: '{display} is sorting this data grid',
        values: { display },
      }),
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
    'euiColumnSortingDraggable.removeSortLabel': ({ display }: EuiValues) =>
      i18n.translate('core.euiColumnSortingDraggable.removeSortLabel', {
        defaultMessage: 'Remove {display} from data grid sort',
        values: { display },
      }),
    'euiColumnSortingDraggable.toggleLegend': ({ display }: EuiValues) =>
      i18n.translate('core.euiColumnSortingDraggable.toggleLegend', {
        defaultMessage: 'Select sorting method for {display}',
        values: { display },
      }),
    'euiComboBox.listboxAriaLabel': i18n.translate('core.euiComboBox.listboxAriaLabel', {
      defaultMessage: 'Choose from the following options',
    }),
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
    'euiComboBoxOptionsList.createCustomOption': ({ searchValue }: EuiValues) => (
      <FormattedMessage
        id="core.euiComboBoxOptionsList.createCustomOption"
        defaultMessage="Add {searchValue} as a custom option"
        values={{ searchValue }}
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
    'euiComboBoxOptionsList.delimiterMessage': ({ delimiter }: EuiValues) =>
      i18n.translate('core.euiComboBoxOptionsList.delimiterMessage', {
        defaultMessage: 'Add each item separated by {delimiter}',
        values: { delimiter },
        description: 'Screen reader text describing adding delimited options',
      }),
    'euiComboBoxPill.removeSelection': ({ children }: EuiValues) =>
      i18n.translate('core.euiComboBoxPill.removeSelection', {
        defaultMessage: 'Remove {children} from selection in this group',
        values: { children },
        description: 'ARIA label, `children` is the human-friendly value of an option',
      }),
    'euiCommonlyUsedTimeRanges.legend': i18n.translate('core.euiCommonlyUsedTimeRanges.legend', {
      defaultMessage: 'Commonly used',
    }),
    'euiControlBar.screenReaderHeading': i18n.translate('core.euiControlBar.screenReaderHeading', {
      defaultMessage: 'Page level controls',
    }),
    'euiControlBar.screenReaderAnnouncement': i18n.translate(
      'core.euiControlBar.screenReaderAnnouncement',
      {
        defaultMessage:
          'There is a new region landmark with page level controls at the end of the document.',
      }
    ),
    'euiControlBar.customScreenReaderAnnouncement': ({ landmarkHeading }: EuiValues) =>
      i18n.translate('core.euiControlBar.customScreenReaderAnnouncement', {
        defaultMessage:
          'There is a new region landmark called {landmarkHeading} with page level controls at the end of the document.',
        values: { landmarkHeading },
      }),
    'euiDataGrid.screenReaderNotice': i18n.translate('core.euiDataGrid.screenReaderNotice', {
      defaultMessage: 'Cell contains interactive content.',
    }),
    'euiDataGrid.ariaLabel': ({ label, page, pageCount }: EuiValues) =>
      i18n.translate('core.euiDataGrid.ariaLabel', {
        defaultMessage: '{label}; Page {page} of {pageCount}.',
        values: { label, page, pageCount },
        description: 'Screen reader text to describe the size of the data grid',
      }),
    'euiDataGrid.ariaLabelledBy': ({ page, pageCount }: EuiValues) =>
      i18n.translate('core.euiDataGrid.ariaLabelledBy', {
        defaultMessage: 'Page {page} of {pageCount}.',
        values: { page, pageCount },
        description: 'Screen reader text to describe the size of the data grid',
      }),
    'euiDataGridCell.position': ({ row, col }: EuiValues) =>
      i18n.translate('core.euiDataGridCell.position', {
        defaultMessage: 'Row: {row}; Column: {col}',
        values: { row, col },
      }),
    'euiDataGridCellActions.expandButtonTitle': i18n.translate(
      'core.euiDataGridCellActions.expandButtonTitle',
      {
        defaultMessage: 'Click or hit enter to interact with cell content',
      }
    ),
    'euiDataGridHeaderCell.headerActions': i18n.translate(
      'core.euiDataGridHeaderCell.headerActions',
      {
        defaultMessage: 'Header actions',
      }
    ),
    'euiDataGridPagination.detailedPaginationLabel': ({ label }: EuiValues) =>
      i18n.translate('core.euiDataGridPagination.detailedPaginationLabel', {
        defaultMessage: 'Pagination for preceding grid: {label}',
        values: { label },
      }),
    'euiDataGridPagination.paginationLabel': i18n.translate(
      'core.euiDataGridPagination.paginationLabel',
      {
        defaultMessage: 'Pagination for preceding grid',
      }
    ),
    'euiDataGridSchema.booleanSortTextAsc': i18n.translate(
      'core.euiDataGridSchema.booleanSortTextAsc',
      {
        defaultMessage: 'False-True',
        description: 'Ascending boolean label',
      }
    ),
    'euiDataGridSchema.booleanSortTextDesc': i18n.translate(
      'core.euiDataGridSchema.booleanSortTextDesc',
      {
        defaultMessage: 'True-False',
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
      defaultMessage: 'Old-New',
      description: 'Ascending date label',
    }),
    'euiDataGridSchema.dateSortTextDesc': i18n.translate(
      'core.euiDataGridSchema.dateSortTextDesc',
      {
        defaultMessage: 'New-Old',
        description: 'Descending date label',
      }
    ),
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
    'euiDataGridSchema.jsonSortTextDesc': i18n.translate(
      'core.euiDataGridSchema.jsonSortTextDesc',
      {
        defaultMessage: 'Large-Small',
        description: 'Descending size label',
      }
    ),
    'euiDatePopoverButton.invalidTitle': ({ title }: EuiValues) =>
      i18n.translate('core.euiDatePopoverButton.invalidTitle', {
        defaultMessage: 'Invalid date: {title}',
        values: { title },
      }),
    'euiDatePopoverButton.outdatedTitle': ({ title }: EuiValues) =>
      i18n.translate('core.euiDatePopoverButton.outdatedTitle', {
        defaultMessage: 'Update needed: {title}',
        values: { title },
      }),
    'euiDisplaySelector.buttonText': i18n.translate('core.euiDisplaySelector.buttonText', {
      defaultMessage: 'Display options',
    }),
    'euiDisplaySelector.resetButtonText': i18n.translate(
      'core.euiDisplaySelector.resetButtonText',
      {
        defaultMessage: 'Reset to default',
      }
    ),
    'euiDisplaySelector.densityLabel': i18n.translate('core.euiDisplaySelector.densityLabel', {
      defaultMessage: 'Density',
    }),
    'euiDisplaySelector.labelCompact': i18n.translate('core.euiDisplaySelector.labelCompact', {
      defaultMessage: 'Compact',
    }),
    'euiDisplaySelector.labelNormal': i18n.translate('core.euiDisplaySelector.labelNormal', {
      defaultMessage: 'Normal',
    }),
    'euiDisplaySelector.labelExpanded': i18n.translate('core.euiDisplaySelector.labelExpanded', {
      defaultMessage: 'Expanded',
    }),
    'euiDisplaySelector.labelSingle': i18n.translate('core.euiDisplaySelector.labelSingle', {
      defaultMessage: 'Single',
    }),
    'euiDisplaySelector.labelAuto': i18n.translate('core.euiDisplaySelector.labelAuto', {
      defaultMessage: 'Auto fit',
    }),
    'euiDisplaySelector.labelCustom': i18n.translate('core.euiDisplaySelector.labelCustom', {
      defaultMessage: 'Custom',
    }),
    'euiDisplaySelector.rowHeightLabel': i18n.translate('core.euiDisplaySelector.rowHeightLabel', {
      defaultMessage: 'Row height',
    }),
    'euiDisplaySelector.lineCountLabel': i18n.translate('core.euiDisplaySelector.lineCountLabel', {
      defaultMessage: 'Lines per row',
    }),
    'euiFieldPassword.showPassword': i18n.translate('core.euiFieldPassword.showPassword', {
      defaultMessage:
        'Show password as plain text. Note: this will visually expose your password on the screen.',
    }),
    'euiFieldPassword.maskPassword': i18n.translate('core.euiFieldPassword.maskPassword', {
      defaultMessage: 'Mask password',
    }),
    'euiFilePicker.clearSelectedFiles': i18n.translate('core.euiFilePicker.clearSelectedFiles', {
      defaultMessage: 'Clear selected files',
    }),
    'euiFilePicker.filesSelected': ({ fileCount }: EuiValues) =>
      i18n.translate('core.euiFilePicker.filesSelected', {
        defaultMessage: '{fileCount} files selected',
        values: { fileCount },
      }),
    'euiFilePicker.promptText': i18n.translate('core.euiFilePicker.promptText', {
      defaultMessage: 'Select or drag and drop a file',
    }),
    'euiFilePicker.removeSelected': i18n.translate('core.euiFilePicker.removeSelected', {
      defaultMessage: 'Remove',
    }),
    'euiFilterButton.filterBadgeActiveAriaLabel': ({ count }: EuiValues) =>
      i18n.translate('core.euiFilterButton.filterBadgeActiveAriaLabel', {
        defaultMessage: '{count} active filters',
        values: { count },
      }),
    'euiFilterButton.filterBadgeAvailableAriaLabel': ({ count }: EuiValues) =>
      i18n.translate('core.euiFilterButton.filterBadgeAvailableAriaLabel', {
        defaultMessage: '{count} available filters',
        values: { count },
      }),
    'euiFlyout.closeAriaLabel': i18n.translate('core.euiFlyout.closeAriaLabel', {
      defaultMessage: 'Close this dialog',
    }),
    'euiForm.addressFormErrors': i18n.translate('core.euiForm.addressFormErrors', {
      defaultMessage: 'Please address the highlighted errors.',
    }),
    'euiFormControlLayoutClearButton.label': i18n.translate(
      'core.euiFormControlLayoutClearButton.label',
      {
        defaultMessage: 'Clear input',
        description: 'ARIA label on a button that removes any entry in a form field',
      }
    ),
    'euiFullscreenSelector.fullscreenButton': i18n.translate(
      'core.euiFullscreenSelector.fullscreenButton',
      {
        defaultMessage: 'Enter fullscreen',
      }
    ),
    'euiFullscreenSelector.fullscreenButtonActive': i18n.translate(
      'core.euiFullscreenSelector.fullscreenButtonActive',
      {
        defaultMessage: 'Exit fullscreen',
      }
    ),
    'euiHeaderLinks.appNavigation': i18n.translate('core.euiHeaderLinks.appNavigation', {
      defaultMessage: 'App menu',
      description: 'ARIA label on a `nav` element',
    }),
    'euiHeaderLinks.openNavigationMenu': i18n.translate('core.euiHeaderLinks.openNavigationMenu', {
      defaultMessage: 'Open menu',
    }),
    'euiHue.label': i18n.translate('core.euiHue.label', {
      defaultMessage: 'Select the HSV color mode "hue" value',
    }),
    'euiImage.closeImage': ({ alt }: EuiValues) =>
      i18n.translate('core.euiImage.closeImage', {
        defaultMessage: 'Close fullscreen {alt} image',
        values: { alt },
      }),
    'euiImage.openImage': ({ alt }: EuiValues) =>
      i18n.translate('core.euiImage.openImage', {
        defaultMessage: 'Open fullscreen {alt} image',
        values: { alt },
      }),
    'euiLink.external.ariaLabel': i18n.translate('core.euiLink.external.ariaLabel', {
      defaultMessage: 'External link',
    }),
    'euiLink.newTarget.screenReaderOnlyText': i18n.translate(
      'core.euiLink.newTarget.screenReaderOnlyText',
      {
        defaultMessage: '(opens in a new tab or window)',
      }
    ),
    'euiMarkdownEditorFooter.closeButton': i18n.translate(
      'core.euiMarkdownEditorFooter.closeButton',
      {
        defaultMessage: 'Close',
      }
    ),
    'euiMarkdownEditorFooter.uploadingFiles': i18n.translate(
      'core.euiMarkdownEditorFooter.uploadingFiles',
      {
        defaultMessage: 'Click to upload files',
      }
    ),
    'euiMarkdownEditorFooter.openUploadModal': i18n.translate(
      'core.euiMarkdownEditorFooter.openUploadModal',
      {
        defaultMessage: 'Open upload files modal',
      }
    ),
    'euiMarkdownEditorFooter.unsupportedFileType': i18n.translate(
      'core.euiMarkdownEditorFooter.unsupportedFileType',
      {
        defaultMessage: 'File type not supported',
      }
    ),
    'euiMarkdownEditorFooter.supportedFileTypes': ({ supportedFileTypes }: EuiValues) =>
      i18n.translate('core.euiMarkdownEditorFooter.supportedFileTypes', {
        defaultMessage: 'Supported files: {supportedFileTypes}',
        values: { supportedFileTypes },
      }),
    'euiMarkdownEditorFooter.showSyntaxErrors': i18n.translate(
      'core.euiMarkdownEditorFooter.showSyntaxErrors',
      {
        defaultMessage: 'Show errors',
      }
    ),
    'euiMarkdownEditorFooter.showMarkdownHelp': i18n.translate(
      'core.euiMarkdownEditorFooter.showMarkdownHelp',
      {
        defaultMessage: 'Show markdown help',
      }
    ),
    'euiMarkdownEditorFooter.errorsTitle': i18n.translate(
      'core.euiMarkdownEditorFooter.errorsTitle',
      {
        defaultMessage: 'Errors',
      }
    ),
    'euiMarkdownEditorFooter.syntaxTitle': i18n.translate(
      'core.euiMarkdownEditorFooter.syntaxTitle',
      {
        defaultMessage: 'Syntax help',
      }
    ),
    'euiMarkdownEditorFooter.mdSyntaxLink': i18n.translate(
      'core.euiMarkdownEditorFooter.mdSyntaxLink',
      {
        defaultMessage: 'GitHub flavored markdown',
      }
    ),
    'euiMarkdownEditorFooter.syntaxModalDescriptionPrefix': i18n.translate(
      'core.euiMarkdownEditorFooter.syntaxModalDescriptionPrefix',
      {
        defaultMessage: 'This editor uses',
      }
    ),
    'euiMarkdownEditorFooter.syntaxModalDescriptionSuffix': i18n.translate(
      'core.euiMarkdownEditorFooter.syntaxModalDescriptionSuffix',
      {
        defaultMessage:
          'You can also utilize these additional syntax plugins to add rich content to your text.',
      }
    ),
    'euiMarkdownEditorFooter.syntaxPopoverDescription': i18n.translate(
      'core.euiMarkdownEditorFooter.syntaxPopoverDescription',
      {
        defaultMessage: 'This editor uses',
      }
    ),
    'euiMarkdownEditorToolbar.editor': i18n.translate('core.euiMarkdownEditorToolbar.editor', {
      defaultMessage: 'Editor',
    }),
    'euiMarkdownEditorToolbar.previewMarkdown': i18n.translate(
      'core.euiMarkdownEditorToolbar.previewMarkdown',
      {
        defaultMessage: 'Preview',
      }
    ),
    'euiModal.closeModal': i18n.translate('core.euiModal.closeModal', {
      defaultMessage: 'Closes this modal window',
    }),
    'euiNotificationEventMessages.accordionButtonText': ({ messagesLength }: EuiValues) =>
      i18n.translate('core.euiNotificationEventMessages.accordionButtonText', {
        defaultMessage: '+ {messagesLength} more',
        values: { messagesLength },
      }),
    'euiErrorBoundary.error': i18n.translate('core.euiErrorBoundary.error', {
      defaultMessage: 'Error',
      description: 'Error boundary for uncaught exceptions when rendering part of the application',
    }),
    'euiNotificationEventMessages.accordionAriaLabelButtonText': ({
      messagesLength,
      eventName,
    }: EuiValues) =>
      i18n.translate('core.euiNotificationEventMessages.accordionAriaLabelButtonText', {
        defaultMessage: '+ {messagesLength} messages for {eventName}',
        values: { messagesLength, eventName },
      }),
    'euiNotificationEventMeta.contextMenuButton': ({ eventName }: EuiValues) =>
      i18n.translate('core.euiNotificationEventMeta.contextMenuButton', {
        defaultMessage: 'Menu for {eventName}',
        values: { eventName },
      }),
    'euiNotificationEventReadButton.markAsReadAria': ({ eventName }: EuiValues) =>
      i18n.translate('core.euiNotificationEventReadButton.markAsReadAria', {
        defaultMessage: 'Mark {eventName} as read',
        values: { eventName },
      }),
    'euiNotificationEventReadButton.markAsUnreadAria': ({ eventName }: EuiValues) =>
      i18n.translate('core.euiNotificationEventReadButton.markAsUnreadAria', {
        defaultMessage: 'Mark {eventName} as unread',
        values: { eventName },
      }),
    'euiNotificationEventReadButton.markAsRead': i18n.translate(
      'core.euiNotificationEventReadButton.markAsRead',
      {
        defaultMessage: 'Mark as read',
      }
    ),
    'euiNotificationEventReadButton.markAsUnread': i18n.translate(
      'core.euiNotificationEventReadButton.markAsUnread',
      {
        defaultMessage: 'Mark as unread',
      }
    ),
    'euiNotificationEventMessages.accordionHideText': i18n.translate(
      'core.euiNotificationEventMessages.accordionHideText',
      {
        defaultMessage: 'hide',
      }
    ),
    'euiPagination.pageOfTotalCompressed': ({ page, total }: EuiValues) => (
      <FormattedMessage
        id="core.euiPagination.pageOfTotalCompressed"
        defaultMessage="{page} of {total}"
        values={{ page, total }}
      />
    ),
    'euiPagination.firstRangeAriaLabel': ({ lastPage }: EuiValues) =>
      i18n.translate('core.euiPagination.firstRangeAriaLabel', {
        defaultMessage: 'Skipping pages 2 to {lastPage}',
        values: { lastPage },
      }),
    'euiPagination.lastRangeAriaLabel': ({ firstPage, lastPage }: EuiValues) =>
      i18n.translate('core.euiPagination.lastRangeAriaLabel', {
        defaultMessage: 'Skipping pages {firstPage} to {lastPage}',
        values: { firstPage, lastPage },
      }),
    'euiPagination.last': i18n.translate('core.euiPagination.last', {
      defaultMessage: 'Last',
    }),
    'euiPagination.page': i18n.translate('core.euiPagination.page', {
      defaultMessage: 'Page',
    }),
    'euiPagination.of': i18n.translate('core.euiPagination.of', {
      defaultMessage: 'of',
    }),
    'euiPagination.collection': i18n.translate('core.euiPagination.collection', {
      defaultMessage: 'collection',
    }),
    'euiPagination.fromEndLabel': i18n.translate('core.euiPagination.fromEndLabel', {
      defaultMessage: 'from end',
    }),
    'euiPaginationButton.longPageString': ({ page, totalPages }: EuiValues) =>
      i18n.translate('core.euiPaginationButton.longPageString', {
        defaultMessage: 'Page {page} of {totalPages}',
        values: { page, totalPages },
        description: 'Text to describe the size of a paginated section',
      }),
    'euiPaginationButton.shortPageString': ({ page }: EuiValues) =>
      i18n.translate('core.euiPaginationButton.shortPageString', {
        defaultMessage: 'Page {page}',
        values: { page },
        description: 'Text to describe the current page of a paginated section',
      }),
    'euiPaginationButtonArrow.nextPage': i18n.translate('core.euiPaginationButtonArrow.nextPage', {
      defaultMessage: 'Next page',
    }),
    'euiPaginationButtonArrow.previousPage': i18n.translate(
      'core.euiPaginationButtonArrow.previousPage',
      {
        defaultMessage: 'Previous page',
      }
    ),
    'euiPaginationButtonArrow.firstPage': i18n.translate(
      'core.euiPaginationButtonArrow.firstPage',
      {
        defaultMessage: 'First page',
      }
    ),
    'euiPaginationButtonArrow.lastPage': i18n.translate('core.euiPaginationButtonArrow.lastPage', {
      defaultMessage: 'Last page',
    }),
    'euiPinnableListGroup.pinExtraActionLabel': i18n.translate(
      'core.euiPinnableListGroup.pinExtraActionLabel',
      {
        defaultMessage: 'Pin item',
      }
    ),
    'euiPinnableListGroup.pinnedExtraActionLabel': i18n.translate(
      'core.euiPinnableListGroup.pinnedExtraActionLabel',
      {
        defaultMessage: 'Unpin item',
      }
    ),
    'euiPopover.screenReaderAnnouncement': i18n.translate(
      'core.euiPopover.screenReaderAnnouncement',
      {
        defaultMessage: 'You are in a dialog. To close this dialog, hit escape.',
      }
    ),
    'euiProgress.valueText': ({ value }: EuiValues) =>
      i18n.translate('core.euiProgress.valueText', {
        defaultMessage: '{value}%',
        values: { value },
      }),
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
    'euiRecentlyUsed.legend': i18n.translate('core.euiRecentlyUsed.legend', {
      defaultMessage: 'Recently used date ranges',
    }),
    'euiRefreshInterval.legend': i18n.translate('core.euiRefreshInterval.legend', {
      defaultMessage: 'Refresh every',
    }),
    'euiRefreshInterval.fullDescriptionOff': ({ optionValue, optionText }: EuiValues) =>
      i18n.translate('core.euiRefreshInterval.fullDescriptionOff', {
        defaultMessage: 'Refresh is off, interval set to {optionValue} {optionText}.',
        values: { optionValue, optionText },
      }),
    'euiRefreshInterval.fullDescriptionOn': ({ optionValue, optionText }: EuiValues) =>
      i18n.translate('core.euiRefreshInterval.fullDescriptionOn', {
        defaultMessage: 'Refresh is on, interval set to {optionValue} {optionText}.',
        values: { optionValue, optionText },
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
    'euiRelativeTab.numberInputError': i18n.translate('core.euiRelativeTab.numberInputError', {
      defaultMessage: 'Must be >= 0',
    }),
    'euiRelativeTab.numberInputLabel': i18n.translate('core.euiRelativeTab.numberInputLabel', {
      defaultMessage: 'Time span amount',
    }),
    'euiRelativeTab.dateInputError': i18n.translate('core.euiRelativeTab.dateInputError', {
      defaultMessage: 'Must be a valid range',
    }),
    'euiResizableButton.horizontalResizerAriaLabel': i18n.translate(
      'core.euiResizableButton.horizontalResizerAriaLabel',
      {
        defaultMessage: 'Press left or right to adjust panels size',
      }
    ),
    'euiResizableButton.verticalResizerAriaLabel': i18n.translate(
      'core.euiResizableButton.verticalResizerAriaLabel',
      {
        defaultMessage: 'Press up or down to adjust panels size',
      }
    ),
    'euiResizablePanel.toggleButtonAriaLabel': i18n.translate(
      'core.euiResizablePanel.toggleButtonAriaLabel',
      {
        defaultMessage: 'Press to toggle this panel',
      }
    ),
    'euiSaturation.screenReaderInstructions': i18n.translate(
      'core.euiSaturation.screenReaderInstructions',
      {
        defaultMessage:
          'Arrow keys to navigate the square color gradient. Coordinates will be used to calculate HSV color mode "saturation" and "value" numbers, in the range of 0 to 1. Left and right to change the saturation. Up and down change the value.',
      }
    ),
    'euiSaturation.ariaLabel': i18n.translate('core.euiSaturation.ariaLabel', {
      defaultMessage: 'HSV color mode saturation and value 2-axis slider',
    }),
    'euiSelectable.loadingOptions': i18n.translate('core.euiSelectable.loadingOptions', {
      defaultMessage: 'Loading options',
      description: 'Placeholder message while data is asynchronously loaded',
    }),
    'euiSelectable.noAvailableOptions': i18n.translate('core.euiSelectable.noAvailableOptions', {
      defaultMessage: 'No options available',
    }),
    'euiSelectable.noMatchingOptions': ({ searchValue }: EuiValues) => (
      <FormattedMessage
        id="core.euiSelectable.noMatchingOptions"
        defaultMessage="{searchValue} doesn't match any options"
        values={{ searchValue }}
      />
    ),
    'euiSelectable.screenReaderInstructions': i18n.translate(
      'core.euiSelectable.screenReaderInstructions',
      {
        defaultMessage:
          'Use up and down arrows to move focus over options. Enter to select. Escape to collapse options.',
      }
    ),
    'euiSelectable.searchResults': ({ resultsLength }: EuiValues) =>
      i18n.translate('core.euiSelectable.searchResults', {
        defaultMessage: '{resultsLength, plural, one {# result} other {# results}} available',
        values: { resultsLength },
      }),
    'euiSelectable.placeholderName': i18n.translate('core.euiSelectable.placeholderName', {
      defaultMessage: 'Filter options',
    }),
    'euiSelectableListItem.checkedOption': i18n.translate(
      'core.euiSelectableListItem.checkedOption',
      {
        defaultMessage: 'Checked option.',
      }
    ),
    'euiSelectableListItem.checkedOptionInstructions': i18n.translate(
      'core.euiSelectableListItem.checkedOptionInstructions',
      {
        defaultMessage: 'To uncheck this option, press enter.',
      }
    ),
    'euiSelectableListItem.includedOption': i18n.translate(
      'core.euiSelectableListItem.includedOption',
      {
        defaultMessage: 'Selected option.',
      }
    ),
    'euiSelectableListItem.includedOptionInstructions': i18n.translate(
      'core.euiSelectableListItem.includedOptionInstructions',
      {
        defaultMessage: 'To exclude this option, press enter.',
      }
    ),
    'euiSelectableListItem.excludedOption': i18n.translate(
      'core.euiSelectableListItem.excludedOption',
      {
        defaultMessage: 'Excluded option.',
      }
    ),
    'euiSelectableListItem.excludedOptionInstructions': i18n.translate(
      'core.euiSelectableListItem.excludedOptionInstructions',
      {
        defaultMessage: 'To uncheck this option, press enter.',
      }
    ),
    'euiSelectableListItem.unckeckedOptionInstructions': i18n.translate(
      'core.euiSelectableListItem.unckeckedOptionInstructions',
      {
        defaultMessage: 'To select this option, press enter.',
      }
    ),
    'euiSelectableTemplateSitewide.loadingResults': i18n.translate(
      'core.euiSelectableTemplateSitewide.loadingResults',
      {
        defaultMessage: 'Loading results',
      }
    ),
    'euiSelectableTemplateSitewide.noResults': i18n.translate(
      'core.euiSelectableTemplateSitewide.noResults',
      {
        defaultMessage: 'No results available',
      }
    ),
    'euiSelectableTemplateSitewide.onFocusBadgeGoTo': i18n.translate(
      'core.euiSelectableTemplateSitewide.onFocusBadgeGoTo',
      {
        defaultMessage: 'Go to',
      }
    ),
    'euiSelectableTemplateSitewide.searchPlaceholder': i18n.translate(
      'core.euiSelectableTemplateSitewide.searchPlaceholder',
      {
        defaultMessage: 'Search for anything...',
      }
    ),
    'euiStat.loadingText': i18n.translate('core.euiStat.loadingText', {
      defaultMessage: 'Statistic is loading',
    }),
    'euiStepStrings.step': ({ number, title }: EuiValues) =>
      i18n.translate('core.euiStepStrings.step', {
        defaultMessage: 'Step {number}: {title}',
        values: { number, title },
      }),
    'euiStepStrings.simpleStep': ({ number }: EuiValues) =>
      i18n.translate('core.euiStepStrings.simpleStep', {
        defaultMessage: 'Step {number}',
        values: { number },
      }),
    'euiStepStrings.complete': ({ number, title }: EuiValues) =>
      i18n.translate('core.euiStepStrings.complete', {
        defaultMessage: 'Step {number}: {title} is complete',
        values: { number, title },
      }),
    'euiStepStrings.current': ({ number, title }: EuiValues) =>
      i18n.translate('core.euiStepStrings.current', {
        defaultMessage: 'Current step {number}: {title}',
        values: { number, title },
      }),
    'euiStepStrings.simpleComplete': ({ number }: EuiValues) =>
      i18n.translate('core.euiStepStrings.simpleComplete', {
        defaultMessage: 'Step {number} is complete',
        values: { number },
      }),
    'euiStepStrings.simpleCurrent': ({ number }: EuiValues) =>
      i18n.translate('core.euiStepStrings.simpleCurrent', {
        defaultMessage: 'Current step is {number}',
        values: { number },
      }),
    'euiStepStrings.warning': ({ number, title }: EuiValues) =>
      i18n.translate('core.euiStepStrings.warning', {
        defaultMessage: 'Step {number}: {title} has warnings',
        values: { number, title },
      }),
    'euiStepStrings.simpleWarning': ({ number }: EuiValues) =>
      i18n.translate('core.euiStepStrings.simpleWarning', {
        defaultMessage: 'Step {number} has warnings',
        values: { number },
      }),
    'euiStepStrings.errors': ({ number, title }: EuiValues) =>
      i18n.translate('core.euiStepStrings.errors', {
        defaultMessage: 'Step {number}: {title} has errors',
        values: { number, title },
      }),
    'euiStepStrings.simpleErrors': ({ number }: EuiValues) =>
      i18n.translate('core.euiStepStrings.simpleErrors', {
        defaultMessage: 'Step {number} has errors',
        values: { number },
      }),
    'euiStepStrings.incomplete': ({ number, title }: EuiValues) =>
      i18n.translate('core.euiStepStrings.incomplete', {
        defaultMessage: 'Step {number}: {title} is incomplete',
        values: { number, title },
      }),
    'euiStepStrings.simpleIncomplete': ({ number }: EuiValues) =>
      i18n.translate('core.euiStepStrings.simpleIncomplete', {
        defaultMessage: 'Step {number} is incomplete',
        values: { number },
      }),
    'euiStepStrings.disabled': ({ number, title }: EuiValues) =>
      i18n.translate('core.euiStepStrings.disabled', {
        defaultMessage: 'Step {number}: {title} is disabled',
        values: { number, title },
      }),
    'euiStepStrings.simpleDisabled': ({ number }: EuiValues) =>
      i18n.translate('core.euiStepStrings.simpleDisabled', {
        defaultMessage: 'Step {number} is disabled',
        values: { number },
      }),
    'euiStepStrings.loading': ({ number, title }: EuiValues) =>
      i18n.translate('core.euiStepStrings.loading', {
        defaultMessage: 'Step {number}: {title} is loading',
        values: { number, title },
      }),
    'euiStepStrings.simpleLoading': ({ number }: EuiValues) =>
      i18n.translate('core.euiStepStrings.simpleLoading', {
        defaultMessage: 'Step {number} is loading',
        values: { number },
      }),
    'euiSuggest.stateSavedTooltip': i18n.translate('core.euiSuggest.stateSavedTooltip', {
      defaultMessage: 'Saved.',
    }),

    'euiSuggest.stateUnsavedTooltip': i18n.translate('core.euiSuggest.stateUnsavedTooltip', {
      defaultMessage: 'Changes have not been saved.',
    }),

    'euiSuggest.stateLoading': i18n.translate('core.euiSuggest.stateLoading', {
      defaultMessage: 'State: loading.',
    }),

    'euiSuggest.stateSaved': i18n.translate('core.euiSuggest.stateSaved', {
      defaultMessage: 'State: saved.',
    }),

    'euiSuggest.stateUnsaved': i18n.translate('core.euiSuggest.stateUnsaved', {
      defaultMessage: 'State: unsaved.',
    }),
    'euiSuggest.stateUnchanged': i18n.translate('core.euiSuggest.stateUnchanged', {
      defaultMessage: 'State: unchanged.',
    }),
    'euiSuperSelect.screenReaderAnnouncement': i18n.translate(
      'core.euiSuperSelect.screenReaderAnnouncement',
      {
        defaultMessage:
          'You are in a form selector and must select a single option. Use the up and down keys to navigate or escape to close.',
      }
    ),
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
    'euiTableHeaderCell.titleTextWithDesc': ({ innerText, description }: EuiValues) =>
      i18n.translate('core.euiTableHeaderCell.titleTextWithDesc', {
        defaultMessage: '{innerText}; {description}',
        values: { innerText, description },
        description: 'Displayed in a cell in the header of the table to describe the field',
      }),
    'euiTablePagination.allRows': i18n.translate('core.euiTablePagination.allRows', {
      defaultMessage: 'Showing all rows',
      description: 'Displayed in a button that toggles a table pagination menu',
    }),
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
    'euiTablePagination.rowsPerPageOptionShowAllRows': i18n.translate(
      'core.euiTablePagination.rowsPerPageOptionShowAllRows',
      {
        defaultMessage: 'Show all rows',
        description: 'Displayed in a button that toggles the number of visible rows',
      }
    ),
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
    'euiTourStep.endTour': i18n.translate('core.euiTourStep.endTour', {
      defaultMessage: 'End tour',
    }),
    'euiTourStep.skipTour': i18n.translate('core.euiTourStep.skipTour', {
      defaultMessage: 'Skip tour',
    }),
    'euiTourStep.closeTour': i18n.translate('core.euiTourStep.closeTour', {
      defaultMessage: 'Close tour',
    }),
    'euiTourStepIndicator.isActive': i18n.translate('core.euiTourStepIndicator.isActive', {
      defaultMessage: 'active',
      description: 'Text for an active tour step',
    }),
    'euiTourStepIndicator.isComplete': i18n.translate('core.euiTourStepIndicator.isComplete', {
      defaultMessage: 'complete',
      description: 'Text for a completed tour step',
    }),
    'euiTourStepIndicator.isIncomplete': i18n.translate('core.euiTourStepIndicator.isIncomplete', {
      defaultMessage: 'incomplete',
      description: 'Text for an incomplete tour step',
    }),
    'euiTourStepIndicator.ariaLabel': ({ status, number }: EuiValues) =>
      i18n.translate('core.euiTourStepIndicator.ariaLabel', {
        defaultMessage: 'Step {number} {status}',
        values: { status, number },
        description: 'Screen reader text describing the state of a tour step',
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
    'euiNotificationEventReadIcon.read': i18n.translate('core.euiNotificationEventReadIcon.read', {
      defaultMessage: 'Read',
    }),
    'euiNotificationEventReadIcon.readAria': ({ eventName }: EuiValues) =>
      i18n.translate('core.euiNotificationEventReadIcon.readAria', {
        defaultMessage: '{eventName} is read',
        values: { eventName },
      }),
    'euiNotificationEventReadIcon.unread': i18n.translate(
      'core.euiNotificationEventReadIcon.unread',
      {
        defaultMessage: 'Unread',
      }
    ),
    'euiNotificationEventReadIcon.unreadAria': ({ eventName }: EuiValues) =>
      i18n.translate('core.euiNotificationEventReadIcon.unreadAria', {
        defaultMessage: '{eventName} is unread',
        values: { eventName },
      }),
  };
};
