/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const ControlGroupStrings = {
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
      noControlTypeMessage: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.noControlTypeMessage', {
          defaultMessage: 'No field selected yet',
        }),
      getFieldTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.fieldTitle', {
          defaultMessage: 'Field',
        }),
      getControlTypeTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.controlTypesTitle', {
          defaultMessage: 'Control type',
        }),
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
    validateSelections: {
      getValidateSelectionsTitle: () =>
        i18n.translate('controls.controlGroup.management.validate.title', {
          defaultMessage: 'Validate user selections',
        }),
      getValidateSelectionsSubTitle: () =>
        i18n.translate('controls.controlGroup.management.validate.subtitle', {
          defaultMessage:
            'Automatically ignore any control selection that would result in no data.',
        }),
    },
    controlChaining: {
      getHierarchyTitle: () =>
        i18n.translate('controls.controlGroup.management.hierarchy.title', {
          defaultMessage: 'Chain controls',
        }),
      getHierarchySubTitle: () =>
        i18n.translate('controls.controlGroup.management.hierarchy.subtitle', {
          defaultMessage:
            'Selections in one control narrow down available options in the next. Controls are chained from left to right.',
        }),
    },
    querySync: {
      getQuerySettingsTitle: () =>
        i18n.translate('controls.controlGroup.management.query.searchSettingsTitle', {
          defaultMessage: 'Sync with query bar',
        }),
      getQuerySettingsSubtitle: () =>
        i18n.translate('controls.controlGroup.management.query.useAllSearchSettingsTitle', {
          defaultMessage:
            'Keeps the control group in sync with the query bar by applying time range, filter pills, and queries from the query bar',
        }),
      getAdvancedSettingsTitle: () =>
        i18n.translate('controls.controlGroup.management.query.advancedSettings', {
          defaultMessage: 'Advanced',
        }),
      getIgnoreTimerangeTitle: () =>
        i18n.translate('controls.controlGroup.management.query.ignoreTimerange', {
          defaultMessage: 'Ignore timerange',
        }),
      getIgnoreQueryTitle: () =>
        i18n.translate('controls.controlGroup.management.query.ignoreQuery', {
          defaultMessage: 'Ignore query bar',
        }),
      getIgnoreFilterPillsTitle: () =>
        i18n.translate('controls.controlGroup.management.query.ignoreFilterPills', {
          defaultMessage: 'Ignore filter pills',
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
