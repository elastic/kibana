/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const ControlGroupStrings = {
  getControlButtonTitle: () =>
    i18n.translate('controls.controlGroup.toolbarButtonTitle', {
      defaultMessage: 'Controls',
    }),
  getEmbeddableTitle: () =>
    i18n.translate('controls.controlGroup.title', {
      defaultMessage: 'Control group',
    }),
  emptyState: {
    getAddControlButtonTitle: () =>
      i18n.translate('controls.controlGroup.emptyState.addControlButtonTitle', {
        defaultMessage: 'Add control',
      }),
    getBadge: () =>
      i18n.translate('controls.controlGroup.emptyState.badgeText', {
        defaultMessage: 'New',
      }),
    getCallToAction: () =>
      i18n.translate('controls.controlGroup.emptyState.callToAction', {
        defaultMessage:
          'Filtering your data just got better with Controls, letting you display only the data you want to explore.',
      }),
    getDismissButton: () =>
      i18n.translate('controls.controlGroup.emptyState.dismissButton', {
        defaultMessage: 'Dismiss',
      }),
    getTwoLineLoadingTitle: () =>
      i18n.translate('controls.controlGroup.emptyState.twoLineLoadingTitle', {
        defaultMessage: '...',
      }),
  },
  manageControl: {
    getCancelTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.cancelTitle', {
        defaultMessage: 'Cancel',
      }),
    getControlSettingsTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.controlSettingsTitle', {
        defaultMessage: 'Additional settings',
      }),
    getControlTypeTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.controlTypesTitle', {
        defaultMessage: 'Control type',
      }),
    getDataViewTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.dataViewTitle', {
        defaultMessage: 'Data view',
      }),
    getFieldTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.fielditle', {
        defaultMessage: 'Field',
      }),
    getFlyoutCreateTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.createFlyoutTitle', {
        defaultMessage: 'Create control',
      }),
    getFlyoutEditTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.editFlyoutTitle', {
        defaultMessage: 'Edit control',
      }),
    getGrowSwitchTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.growSwitchTitle', {
        defaultMessage: 'Expand width to fit available space',
      }),
    getSaveChangesTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.saveChangesTitle', {
        defaultMessage: 'Save and close',
      }),
    getSelectDataViewMessage: () =>
      i18n.translate('controls.controlGroup.manageControl.selectDataViewMessage', {
        defaultMessage: 'Please select a data view',
      }),
    getSelectFieldMessage: () =>
      i18n.translate('controls.controlGroup.manageControl.selectFieldMessage', {
        defaultMessage: 'Please select a field',
      }),
    getTitleInputTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.titleInputTitle', {
        defaultMessage: 'Label',
      }),
    getWidthInputTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.widthInputTitle', {
        defaultMessage: 'Minimum width',
      }),
  },
  management: {
    getAddControlTitle: () =>
      i18n.translate('controls.controlGroup.management.addControl', {
        defaultMessage: 'Add control',
      }),
    getDeleteAllButtonTitle: () =>
      i18n.translate('controls.controlGroup.management.deleteAll', {
        defaultMessage: 'Delete all',
      }),
    getDeleteButtonTitle: () =>
      i18n.translate('controls.controlGroup.management.delete', {
        defaultMessage: 'Delete control',
      }),
    getFlyoutTitle: () =>
      i18n.translate('controls.controlGroup.management.flyoutTitle', {
        defaultMessage: 'Control settings',
      }),
    getManageButtonTitle: () =>
      i18n.translate('controls.controlGroup.management.buttonTitle', {
        defaultMessage: 'Settings',
      }),
    controlChaining: {
      getHierarchySubTitle: () =>
        i18n.translate('controls.controlGroup.management.hierarchy.subtitle', {
          defaultMessage:
            'Selections in one control narrow down available options in the next. Controls are chained from left to right.',
        }),
      getHierarchyTitle: () =>
        i18n.translate('controls.controlGroup.management.hierarchy.title', {
          defaultMessage: 'Chain controls',
        }),
    },
    controlWidth: {
      getAutoWidthTitle: () =>
        i18n.translate('controls.controlGroup.management.layout.auto', {
          defaultMessage: 'Auto',
        }),
      getLargeWidthTitle: () =>
        i18n.translate('controls.controlGroup.management.layout.large', {
          defaultMessage: 'Large',
        }),
      getMediumWidthTitle: () =>
        i18n.translate('controls.controlGroup.management.layout.medium', {
          defaultMessage: 'Medium',
        }),
      getSmallWidthTitle: () =>
        i18n.translate('controls.controlGroup.management.layout.small', {
          defaultMessage: 'Small',
        }),
      getWidthSwitchLegend: () =>
        i18n.translate('controls.controlGroup.management.layout.controlWidthLegend', {
          defaultMessage: 'Change control size',
        }),
    },
    labelPosition: {
      getAboveTitle: () =>
        i18n.translate('controls.controlGroup.management.labelPosition.above', {
          defaultMessage: 'Above',
        }),
      getInlineTitle: () =>
        i18n.translate('controls.controlGroup.management.labelPosition.inline', {
          defaultMessage: 'Inline',
        }),
      getLabelPositionLegend: () =>
        i18n.translate('controls.controlGroup.management.labelPosition.designSwitchLegend', {
          defaultMessage: 'Switch label position between inline and above',
        }),
      getLabelPositionTitle: () =>
        i18n.translate('controls.controlGroup.management.labelPosition.title', {
          defaultMessage: 'Label position',
        }),
    },
    deleteControls: {
      getCancel: () =>
        i18n.translate('controls.controlGroup.management.delete.cancel', {
          defaultMessage: 'Cancel',
        }),
      getConfirm: () =>
        i18n.translate('controls.controlGroup.management.delete.confirm', {
          defaultMessage: 'Delete',
        }),
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
    },
    discardChanges: {
      getCancel: () =>
        i18n.translate('controls.controlGroup.management.discard.cancel', {
          defaultMessage: 'Cancel',
        }),
      getConfirm: () =>
        i18n.translate('controls.controlGroup.management.discard.confirm', {
          defaultMessage: 'Discard changes',
        }),
      getSubtitle: () =>
        i18n.translate('controls.controlGroup.management.discard.sub', {
          defaultMessage: `Changes that you've made to this control will be discarded, are you sure you want to continue?`,
        }),
      getTitle: () =>
        i18n.translate('controls.controlGroup.management.discard.title', {
          defaultMessage: 'Discard changes?',
        }),
    },
    discardNewControl: {
      getCancel: () =>
        i18n.translate('controls.controlGroup.management.deleteNew.cancel', {
          defaultMessage: 'Cancel',
        }),
      getConfirm: () =>
        i18n.translate('controls.controlGroup.management.deleteNew.confirm', {
          defaultMessage: 'Discard control',
        }),
      getSubtitle: () =>
        i18n.translate('controls.controlGroup.management.deleteNew.sub', {
          defaultMessage: `Changes that you've made to this control will be discarded, are you sure you want to continue?`,
        }),
      getTitle: () =>
        i18n.translate('controls.controlGroup.management.deleteNew.title', {
          defaultMessage: 'Discard new control',
        }),
    },
    validateSelections: {
      getValidateSelectionsSubTitle: () =>
        i18n.translate('controls.controlGroup.management.validate.subtitle', {
          defaultMessage:
            'Automatically ignore any control selection that would result in no data.',
        }),
      getValidateSelectionsTitle: () =>
        i18n.translate('controls.controlGroup.management.validate.title', {
          defaultMessage: 'Validate user selections',
        }),
    },

    querySync: {
      getAdvancedSettingsTitle: () =>
        i18n.translate('controls.controlGroup.management.query.advancedSettings', {
          defaultMessage: 'Advanced',
        }),
      getIgnoreFilterPillsTitle: () =>
        i18n.translate('controls.controlGroup.management.query.ignoreFilterPills', {
          defaultMessage: 'Ignore filter pills',
        }),
      getIgnoreQueryTitle: () =>
        i18n.translate('controls.controlGroup.management.query.ignoreQuery', {
          defaultMessage: 'Ignore query bar',
        }),
      getIgnoreTimerangeTitle: () =>
        i18n.translate('controls.controlGroup.management.query.ignoreTimerange', {
          defaultMessage: 'Ignore timerange',
        }),
      getQuerySettingsSubtitle: () =>
        i18n.translate('controls.controlGroup.management.query.useAllSearchSettingsTitle', {
          defaultMessage:
            'Keeps the control group in sync with the query bar by applying time range, filter pills, and queries from the query bar',
        }),
      getQuerySettingsTitle: () =>
        i18n.translate('controls.controlGroup.management.query.searchSettingsTitle', {
          defaultMessage: 'Sync with query bar',
        }),
    },
  },
  floatingActions: {
    getEditButtonTitle: () =>
      i18n.translate('controls.controlGroup.floatingActions.editTitle', {
        defaultMessage: 'Edit control',
      }),
    getRemoveButtonTitle: () =>
      i18n.translate('controls.controlGroup.floatingActions.removeTitle', {
        defaultMessage: 'Remove control',
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
