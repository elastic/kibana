/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { RANGE_SLIDER_CONTROL } from '../range_slider';

export const ControlGroupStrings = {
  invalidControlWarning: {
    getTourTitle: () =>
      i18n.translate('controls.controlGroup.invalidControlWarning.tourStepTitle.default', {
        defaultMessage: 'Invalid selections are no longer ignored',
      }),
    getTourContent: (controlType: string) => {
      switch (controlType) {
        case RANGE_SLIDER_CONTROL: {
          return i18n.translate(
            'controls.controlGroup.invalidControlWarning.tourStepContent.rangeSlider',
            {
              defaultMessage: 'The selected range is returning no results. Try changing the range.',
            }
          );
        }
        default: {
          return i18n.translate(
            'controls.controlGroup.invalidControlWarning.tourStepContent.default',
            {
              defaultMessage:
                'Some selections are returning no results. Try changing the selections.',
            }
          );
        }
      }
    },

    getDismissButton: () =>
      i18n.translate('controls.controlGroup.invalidControlWarning.dismissButtonLabel', {
        defaultMessage: 'Dismiss',
      }),
    getSuppressTourLabel: () =>
      i18n.translate('controls.controlGroup.invalidControlWarning.suppressTourLabel', {
        defaultMessage: "Don't show again",
      }),
  },
  manageControl: {
    getFlyoutCreateTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.createFlyoutTitle', {
        defaultMessage: 'Create control',
      }),
    getFlyoutEditTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.editFlyoutTitle', {
        defaultMessage: 'Edit control',
      }),
    dataSource: {
      getFormGroupTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.formGroupTitle', {
          defaultMessage: 'Data source',
        }),
      getFormGroupDescription: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.formGroupDescription', {
          defaultMessage: 'Select the data view and field that you want to create a control for.',
        }),
      getSelectDataViewMessage: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.selectDataViewMessage', {
          defaultMessage: 'Please select a data view',
        }),
      getDataViewTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.dataViewTitle', {
          defaultMessage: 'Data view',
        }),
      getFieldTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.fieldTitle', {
          defaultMessage: 'Field',
        }),
      getControlTypeTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.controlTypesTitle', {
          defaultMessage: 'Control type',
        }),
      getControlTypeErrorMessage: ({
        fieldSelected,
        controlType,
      }: {
        fieldSelected?: boolean;
        controlType?: string;
      }) => {
        if (!fieldSelected) {
          return i18n.translate(
            'controls.controlGroup.manageControl.dataSource.controlTypErrorMessage.noField',
            {
              defaultMessage: 'Select a field first.',
            }
          );
        }

        switch (controlType) {
          /**
           * Note that options list controls are currently compatible with every field type; so, there is no
           * need to have a special error message for these.
           */
          case RANGE_SLIDER_CONTROL: {
            return i18n.translate(
              'controls.controlGroup.manageControl.dataSource.controlTypeErrorMessage.rangeSlider',
              {
                defaultMessage: 'Range sliders are only compatible with number fields.',
              }
            );
          }
          default: {
            /** This shouldn't ever happen - but, adding just in case as a fallback. */
            return i18n.translate(
              'controls.controlGroup.manageControl.dataSource.controlTypeErrorMessage.default',
              {
                defaultMessage: 'Select a compatible control type.',
              }
            );
          }
        }
      },
    },
    displaySettings: {
      getFormGroupTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.displaySettings.formGroupTitle', {
          defaultMessage: 'Display settings',
        }),
      getFormGroupDescription: () =>
        i18n.translate('controls.controlGroup.manageControl.displaySettings.formGroupDescription', {
          defaultMessage: 'Change how the control appears on your dashboard.',
        }),
      getTitleInputTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.displaySettings.titleInputTitle', {
          defaultMessage: 'Label',
        }),
      getWidthInputTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.displaySettings.widthInputTitle', {
          defaultMessage: 'Minimum width',
        }),
      getGrowSwitchTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.displaySettings.growSwitchTitle', {
          defaultMessage: 'Expand width to fit available space',
        }),
    },
    controlTypeSettings: {
      getFormGroupTitle: (type: string) =>
        i18n.translate('controls.controlGroup.manageControl.controlTypeSettings.formGroupTitle', {
          defaultMessage: '{controlType} settings',
          values: { controlType: type },
        }),
      getFormGroupDescription: (type: string) =>
        i18n.translate(
          'controls.controlGroup.manageControl.controlTypeSettings.formGroupDescription',
          {
            defaultMessage: 'Custom settings for your {controlType} control.',
            values: { controlType: type.toLocaleLowerCase() },
          }
        ),
    },
    getSaveChangesTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.saveChangesTitle', {
        defaultMessage: 'Save and close',
      }),
    getCancelTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.cancelTitle', {
        defaultMessage: 'Cancel',
      }),
  },
  management: {
    getAddControlTitle: () =>
      i18n.translate('controls.controlGroup.management.addControl', {
        defaultMessage: 'Add control',
      }),
    getApplyButtonTitle: (applyResetButtonsEnabled: boolean) =>
      applyResetButtonsEnabled
        ? i18n.translate('controls.controlGroup.management.applyButtonTooltip.enabled', {
            defaultMessage: 'Apply selections',
          })
        : i18n.translate('controls.controlGroup.management.applyButtonTooltip.disabled', {
            defaultMessage: 'No new selections to apply',
          }),
    getFlyoutTitle: () =>
      i18n.translate('controls.controlGroup.management.flyoutTitle', {
        defaultMessage: 'Control settings',
      }),
    getDeleteButtonTitle: () =>
      i18n.translate('controls.controlGroup.management.delete', {
        defaultMessage: 'Delete control',
      }),
    getDeleteAllButtonTitle: () =>
      i18n.translate('controls.controlGroup.management.deleteAll', {
        defaultMessage: 'Delete all',
      }),
    controlWidth: {
      getWidthSwitchLegend: () =>
        i18n.translate('controls.controlGroup.management.layout.controlWidthLegend', {
          defaultMessage: 'Change control size',
        }),
      getAutoWidthTitle: () =>
        i18n.translate('controls.controlGroup.management.layout.auto', {
          defaultMessage: 'Auto',
        }),
      getSmallWidthTitle: () =>
        i18n.translate('controls.controlGroup.management.layout.small', {
          defaultMessage: 'Small',
        }),
      getMediumWidthTitle: () =>
        i18n.translate('controls.controlGroup.management.layout.medium', {
          defaultMessage: 'Medium',
        }),
      getLargeWidthTitle: () =>
        i18n.translate('controls.controlGroup.management.layout.large', {
          defaultMessage: 'Large',
        }),
    },
    labelPosition: {
      getLabelPositionTitle: () =>
        i18n.translate('controls.controlGroup.management.labelPosition.title', {
          defaultMessage: 'Label position',
        }),
      getLabelPositionLegend: () =>
        i18n.translate('controls.controlGroup.management.labelPosition.designSwitchLegend', {
          defaultMessage: 'Switch label position between inline and above',
        }),
      getInlineTitle: () =>
        i18n.translate('controls.controlGroup.management.labelPosition.inline', {
          defaultMessage: 'Inline',
        }),
      getAboveTitle: () =>
        i18n.translate('controls.controlGroup.management.labelPosition.above', {
          defaultMessage: 'Above',
        }),
    },
    deleteControls: {
      getDeleteAllTitle: () =>
        i18n.translate('controls.controlGroup.management.delete.deleteAllTitle', {
          defaultMessage: 'Delete all controls?',
        }),
      getDeleteTitle: () =>
        i18n.translate('controls.controlGroup.management.delete.deleteTitle', {
          defaultMessage: 'Delete control?',
        }),
      getSubtitle: () =>
        i18n.translate('controls.controlGroup.management.delete.sub', {
          defaultMessage: 'Controls are not recoverable once removed.',
        }),
      getConfirm: () =>
        i18n.translate('controls.controlGroup.management.delete.confirm', {
          defaultMessage: 'Delete',
        }),
      getCancel: () =>
        i18n.translate('controls.controlGroup.management.delete.cancel', {
          defaultMessage: 'Cancel',
        }),
    },
    discardChanges: {
      getTitle: () =>
        i18n.translate('controls.controlGroup.management.discard.title', {
          defaultMessage: 'Discard changes?',
        }),
      getSubtitle: () =>
        i18n.translate('controls.controlGroup.management.discard.sub', {
          defaultMessage: `Changes that you've made to this control will be discarded, are you sure you want to continue?`,
        }),
      getConfirm: () =>
        i18n.translate('controls.controlGroup.management.discard.confirm', {
          defaultMessage: 'Discard changes',
        }),
      getCancel: () =>
        i18n.translate('controls.controlGroup.management.discard.cancel', {
          defaultMessage: 'Cancel',
        }),
    },
    discardNewControl: {
      getTitle: () =>
        i18n.translate('controls.controlGroup.management.deleteNew.title', {
          defaultMessage: 'Discard new control',
        }),
      getSubtitle: () =>
        i18n.translate('controls.controlGroup.management.deleteNew.sub', {
          defaultMessage: `Changes that you've made to this control will be discarded, are you sure you want to continue?`,
        }),
      getConfirm: () =>
        i18n.translate('controls.controlGroup.management.deleteNew.confirm', {
          defaultMessage: 'Discard control',
        }),
      getCancel: () =>
        i18n.translate('controls.controlGroup.management.deleteNew.cancel', {
          defaultMessage: 'Cancel',
        }),
    },
    selectionSettings: {
      getSelectionSettingsTitle: () =>
        i18n.translate('controls.controlGroup.management.selectionSettings', {
          defaultMessage: 'Selections',
        }),
      validateSelections: {
        getValidateSelectionsTitle: () =>
          i18n.translate('controls.controlGroup.management.validate.title', {
            defaultMessage: 'Validate user selections',
          }),
        getValidateSelectionsTooltip: () =>
          i18n.translate('controls.controlGroup.management.validate.tooltip', {
            defaultMessage: 'Highlight control selections that result in no data.',
          }),
      },
      controlChaining: {
        getHierarchyTitle: () =>
          i18n.translate('controls.controlGroup.management.hierarchy.title', {
            defaultMessage: 'Chain controls',
          }),
        getHierarchyTooltip: () =>
          i18n.translate('controls.controlGroup.management.hierarchy.tooltip', {
            defaultMessage:
              'Selections in one control narrow down available options in the next. Controls are chained from left to right.',
          }),
      },
      showApplySelections: {
        getShowApplySelectionsTitle: () =>
          i18n.translate('controls.controlGroup.management.showApplySelections.title', {
            defaultMessage: 'Apply selections automatically',
          }),
        getShowApplySelectionsTooltip: () =>
          i18n.translate('controls.controlGroup.management.showApplySelections.tooltip', {
            defaultMessage:
              'If disabled, control selections will only be applied after clicking apply.',
          }),
      },
    },
    filteringSettings: {
      getFilteringSettingsTitle: () =>
        i18n.translate('controls.controlGroup.management.filteringSettings', {
          defaultMessage: 'Filtering',
        }),
      getUseGlobalFiltersTitle: () =>
        i18n.translate('controls.controlGroup.management.filtering.useGlobalFilters', {
          defaultMessage: 'Apply global filters to controls',
        }),
      getUseGlobalTimeRangeTitle: () =>
        i18n.translate('controls.controlGroup.management.filtering.useGlobalTimeRange', {
          defaultMessage: 'Apply global time range to controls',
        }),
    },
  },
  floatingActions: {
    getEditButtonTitle: () =>
      i18n.translate('controls.controlGroup.floatingActions.editTitle', {
        defaultMessage: 'Edit',
      }),
    getRemoveButtonTitle: () =>
      i18n.translate('controls.controlGroup.floatingActions.removeTitle', {
        defaultMessage: 'Delete',
      }),

    getClearButtonTitle: () =>
      i18n.translate('controls.controlGroup.floatingActions.clearTitle', {
        defaultMessage: 'Clear',
      }),
  },
  ariaActions: {
    getMoveControlButtonAction: (controlTitle?: string) =>
      i18n.translate('controls.controlGroup.ariaActions.moveControlButtonAction', {
        defaultMessage: 'Move control {controlTitle}',
        values: { controlTitle: controlTitle ?? '' },
      }),
  },
};
