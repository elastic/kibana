/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const ControlGroupStrings = {
  getEmbeddableTitle: () =>
    i18n.translate('controls.controlGroup.title', {
      defaultMessage: 'Control group',
    }),
  getControlButtonTitle: () =>
    i18n.translate('controls.controlGroup.toolbarButtonTitle', {
      defaultMessage: 'Controls',
    }),
  emptyState: {
    getCallToAction: () =>
      i18n.translate('controls.controlGroup.emptyState.callToAction', {
        defaultMessage: 'Controls let you filter and interact with your dashboard data',
      }),
    getAddControlButtonTitle: () =>
      i18n.translate('controls.controlGroup.emptyState.addControlButtonTitle', {
        defaultMessage: 'Add control',
      }),
    getTwoLineLoadingTitle: () =>
      i18n.translate('controls.controlGroup.emptyState.twoLineLoadingTitle', {
        defaultMessage: '...',
      }),
    getDismissButton: () =>
      i18n.translate('controls.controlGroup.emptyState.dismissButton', {
        defaultMessage: 'Dismiss',
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
    getTitleInputTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.titleInputTitle', {
        defaultMessage: 'Title',
      }),
    getWidthInputTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.widthInputTitle', {
        defaultMessage: 'Control size',
      }),
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
    getManageButtonTitle: () =>
      i18n.translate('controls.controlGroup.management.buttonTitle', {
        defaultMessage: 'Settings',
      }),
    getFlyoutTitle: () =>
      i18n.translate('controls.controlGroup.management.flyoutTitle', {
        defaultMessage: 'Control settings',
      }),
    getDefaultWidthTitle: () =>
      i18n.translate('controls.controlGroup.management.defaultWidthTitle', {
        defaultMessage: 'Default size',
      }),
    getLayoutTitle: () =>
      i18n.translate('controls.controlGroup.management.layoutTitle', {
        defaultMessage: 'Layout',
      }),
    getDeleteButtonTitle: () =>
      i18n.translate('controls.controlGroup.management.delete', {
        defaultMessage: 'Delete control',
      }),
    getSetAllWidthsToDefaultTitle: () =>
      i18n.translate('controls.controlGroup.management.setAllWidths', {
        defaultMessage: 'Set all sizes to default',
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
    controlStyle: {
      getDesignSwitchLegend: () =>
        i18n.translate('controls.controlGroup.management.layout.designSwitchLegend', {
          defaultMessage: 'Switch control designs',
        }),
      getSingleLineTitle: () =>
        i18n.translate('controls.controlGroup.management.layout.singleLine', {
          defaultMessage: 'Single line',
        }),
      getTwoLineTitle: () =>
        i18n.translate('controls.controlGroup.management.layout.twoLine', {
          defaultMessage: 'Double line',
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
};
