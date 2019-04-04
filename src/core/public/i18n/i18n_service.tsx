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

import { EuiContext } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';

interface EuiValues {
  [key: string]: any;
}

/**
 * Service that is responsible for i18n capabilities.
 * @internal
 */
export class I18nService {
  public setup() {
    const mapping = {
      'euiBasicTable.selectAllRows': i18n.translate('core.euiBasicTable.selectAllRows', {
        defaultMessage: 'Select all rows',
      }),
      'euiBasicTable.selectThisRow': i18n.translate('core.euiBasicTable.selectThisRow', {
        defaultMessage: 'Select this row',
      }),
      'euiBasicTable.tableDescription': ({ itemCount }: EuiValues) =>
        i18n.translate('core.euiBasicTable.tableDescription', {
          defaultMessage: 'Below is a table of {itemCount} items.',
          values: { itemCount },
        }),
      'euiBottomBar.screenReaderAnnouncement': i18n.translate(
        'core.euiBottomBar.screenReaderAnnouncement',
        {
          defaultMessage:
            'There is a new menu opening with page level controls at the end of the document.',
        }
      ),
      'euiCodeBlock.copyButton': i18n.translate('core.euiCodeBlock.copyButton', {
        defaultMessage: 'Copy',
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
      'euiCollapsedItemActions.allActions': i18n.translate(
        'core.euiCollapsedItemActions.allActions',
        {
          defaultMessage: 'All actions',
        }
      ),
      'euiColorPicker.colorSelectionLabel': ({ colorValue }: EuiValues) =>
        i18n.translate('core.euiColorPicker.colorSelectionLabel', {
          defaultMessage: 'Color selection is {colorValue}',
          values: { colorValue },
        }),
      'euiColorPicker.transparentColor': i18n.translate('core.euiColorPicker.transparentColor', {
        defaultMessage: 'transparent',
      }),
      'euiComboBoxOptionsList.allOptionsSelected': i18n.translate(
        'core.euiComboBoxOptionsList.allOptionsSelected',
        {
          defaultMessage: "You've selected all available options",
        }
      ),
      'euiComboBoxOptionsList.alreadyAdded': ({ label }: EuiValues) =>
        i18n.translate('core.euiComboBoxOptionsList.alreadyAdded', {
          defaultMessage: '{label} has already been added',
          values: { label },
        }),
      'euiComboBoxOptionsList.createCustomOption': ({ key, searchValue }: EuiValues) =>
        i18n.translate('core.euiComboBoxOptionsList.createCustomOption', {
          defaultMessage: 'Hit {key} to add {searchValue} as a custom option',
          values: { key, searchValue },
        }),
      'euiComboBoxOptionsList.loadingOptions': i18n.translate(
        'core.euiComboBoxOptionsList.loadingOptions',
        {
          defaultMessage: 'Loading options',
        }
      ),
      'euiComboBoxOptionsList.noAvailableOptions': i18n.translate(
        'core.euiComboBoxOptionsList.noAvailableOptions',
        {
          defaultMessage: "There aren't any options available",
        }
      ),
      'euiComboBoxOptionsList.noMatchingOptions': ({ searchValue }: EuiValues) =>
        i18n.translate('core.euiComboBoxOptionsList.noMatchingOptions', {
          defaultMessage: "{searchValue} doesn't match any options",
          values: { searchValue },
        }),
      'euiComboBoxPill.removeSelection': ({ children }: EuiValues) =>
        i18n.translate('core.euiComboBoxPill.removeSelection', {
          defaultMessage: 'Remove {children} from selection in this group',
          values: { children },
        }),
      'euiForm.addressFormErrors': i18n.translate('core.euiForm.addressFormErrors', {
        defaultMessage: 'Please address the errors in your form.',
      }),
      'euiFormControlLayoutClearButton.label': i18n.translate(
        'core.euiFormControlLayoutClearButton.label',
        {
          defaultMessage: 'Clear input',
        }
      ),
      'euiHeaderAlert.dismiss': i18n.translate('core.euiHeaderAlert.dismiss', {
        defaultMessage: 'Dismiss',
      }),
      'euiHeaderLinks.appNavigation': i18n.translate('core.euiHeaderLinks.appNavigation', {
        defaultMessage: 'App navigation',
      }),
      'euiHeaderLinks.openNavigationMenu': i18n.translate(
        'core.euiHeaderLinks.openNavigationMenu',
        {
          defaultMessage: 'Open navigation menu',
        }
      ),
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
          defaultMessage: 'You are in a popup. To exit this popup, hit escape.',
        }
      ),
      'euiStep.completeStep': i18n.translate('core.euiStep.completeStep', {
        defaultMessage: 'Step',
      }),
      'euiStep.incompleteStep': i18n.translate('core.euiStep.incompleteStep', {
        defaultMessage: 'Incomplete Step',
      }),
      'euiStepHorizontal.buttonTitle': ({ step, title, disabled, isComplete }: EuiValues) => {
        let titleAppendix = '';
        if (disabled) {
          titleAppendix = ' is disabled';
        } else if (isComplete) {
          titleAppendix = ' is complete';
        }

        return i18n.translate('core.euiStepHorizontal.buttonTitle', {
          defaultMessage: 'Step {step}: {title}{titleAppendix}',
          values: {
            step,
            title,
            titleAppendix,
          },
        });
      },
      'euiStepHorizontal.step': i18n.translate('core.euiStepHorizontal.step', {
        defaultMessage: 'Step',
      }),
      'euiStepNumber.hasErrors': i18n.translate('core.euiStepNumber.hasErrors', {
        defaultMessage: 'has errors',
      }),
      'euiStepNumber.hasWarnings': i18n.translate('core.euiStepNumber.hasWarnings', {
        defaultMessage: 'has warnings',
      }),
      'euiStepNumber.isComplete': i18n.translate('core.euiStepNumber.isComplete', {
        defaultMessage: 'complete',
      }),
      'euiSuperSelect.screenReaderAnnouncement': ({ optionsCount }: EuiValues) =>
        i18n.translate('core.euiSuperSelect.screenReaderAnnouncement', {
          defaultMessage:
            'You are in a form selector of {optionsCount} items and must select a single option. Use the up and down keys to navigate or escape to close.',
          values: { optionsCount },
        }),
      'euiSuperSelectControl.selectAnOption': ({ selectedValue }: EuiValues) =>
        i18n.translate('core.euiSuperSelectControl.selectAnOption', {
          defaultMessage: 'Select an option: {selectedValue}, is selected',
          values: { selectedValue },
        }),
      'euiTablePagination.rowsPerPage': i18n.translate('core.euiTablePagination.rowsPerPage', {
        defaultMessage: 'Rows per page',
      }),
      'euiTableSortMobile.sorting': i18n.translate('core.euiTableSortMobile.sorting', {
        defaultMessage: 'Sorting',
      }),
      'euiToast.dismissToast': i18n.translate('core.euiToast.dismissToast', {
        defaultMessage: 'Dismiss toast',
      }),
      'euiToast.newNotification': i18n.translate('core.euiToast.newNotification', {
        defaultMessage: 'A new notification appears',
      }),
      'euiToast.notification': i18n.translate('core.euiToast.notification', {
        defaultMessage: 'Notification',
      }),
    };

    return {
      /**
       * I18n context is required by any localizable React component from @kbn/i18n and @elastic/eui packages
       * and is supposed to be used as the topmost component for any i18n-compatible React tree.
       */
      Context: function I18nContext({ children }: { children: React.ReactNode }) {
        return (
          <I18nProvider>
            <EuiContext i18n={{ mapping }}>{children}</EuiContext>
          </I18nProvider>
        );
      },
    };
  }

  public stop() {
    // nothing to do here currently
  }
}

/** @public */
export type I18nSetup = ReturnType<I18nService['setup']>;
