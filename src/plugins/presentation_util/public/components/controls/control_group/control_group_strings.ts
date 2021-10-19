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
    i18n.translate('presentationUtil.inputControls.controlGroup.title', {
      defaultMessage: 'Control group',
    }),
  manageControl: {
    getFlyoutTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.manageControl.flyoutTitle', {
        defaultMessage: 'Manage control',
      }),
    getTitleInputTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.manageControl.titleInputTitle', {
        defaultMessage: 'Title',
      }),
    getWidthInputTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.manageControl.widthInputTitle', {
        defaultMessage: 'Control width',
      }),
    getSaveChangesTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.manageControl.saveChangesTitle', {
        defaultMessage: 'Save and close',
      }),
    getCancelTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.manageControl.cancelTitle', {
        defaultMessage: 'Cancel',
      }),
  },
  management: {
    getAddControlTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.management.addControl', {
        defaultMessage: 'Add control',
      }),
    getManageButtonTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.management.buttonTitle', {
        defaultMessage: 'Manage controls',
      }),
    getFlyoutTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.management.flyoutTitle', {
        defaultMessage: 'Manage controls',
      }),
    getDefaultWidthTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.management.defaultWidthTitle', {
        defaultMessage: 'Default width',
      }),
    getLayoutTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.management.layoutTitle', {
        defaultMessage: 'Layout',
      }),
    getDeleteButtonTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.management.delete', {
        defaultMessage: 'Delete control',
      }),
    getSetAllWidthsToDefaultTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.management.setAllWidths', {
        defaultMessage: 'Set all widths to default',
      }),
    getDeleteAllButtonTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.management.deleteAll', {
        defaultMessage: 'Delete all',
      }),
    controlWidth: {
      getWidthSwitchLegend: () =>
        i18n.translate(
          'presentationUtil.inputControls.controlGroup.management.layout.controlWidthLegend',
          {
            defaultMessage: 'Change control width',
          }
        ),
      getAutoWidthTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.layout.auto', {
          defaultMessage: 'Auto',
        }),
      getSmallWidthTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.layout.small', {
          defaultMessage: 'Small',
        }),
      getMediumWidthTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.layout.medium', {
          defaultMessage: 'Medium',
        }),
      getLargeWidthTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.layout.large', {
          defaultMessage: 'Large',
        }),
    },
    controlStyle: {
      getDesignSwitchLegend: () =>
        i18n.translate(
          'presentationUtil.inputControls.controlGroup.management.layout.designSwitchLegend',
          {
            defaultMessage: 'Switch control designs',
          }
        ),
      getSingleLineTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.layout.singleLine', {
          defaultMessage: 'Single line layout',
        }),
      getTwoLineTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.layout.twoLine', {
          defaultMessage: 'Two line layout',
        }),
    },
    deleteControls: {
      getDeleteAllTitle: () =>
        i18n.translate(
          'presentationUtil.inputControls.controlGroup.management.delete.deleteAllTitle',
          {
            defaultMessage: 'Delete all controls?',
          }
        ),
      getDeleteTitle: () =>
        i18n.translate(
          'presentationUtil.inputControls.controlGroup.management.delete.deleteTitle',
          {
            defaultMessage: 'Delete control?',
          }
        ),
      getSubtitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.delete.sub', {
          defaultMessage: 'Controls are not recoverable once removed.',
        }),
      getConfirm: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.delete.confirm', {
          defaultMessage: 'Delete',
        }),
      getCancel: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.delete.cancel', {
          defaultMessage: 'Cancel',
        }),
    },
    discardChanges: {
      getTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.discard.title', {
          defaultMessage: 'Discard?',
        }),
      getSubtitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.discard.sub', {
          defaultMessage:
            'Discard changes to this control? Changes are not recoverable once discardsd.',
        }),
      getConfirm: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.discard.confirm', {
          defaultMessage: 'Discard',
        }),
      getCancel: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.discard.cancel', {
          defaultMessage: 'Cancel',
        }),
    },
    discardNewControl: {
      getTitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.deleteNew.title', {
          defaultMessage: 'Discard?',
        }),
      getSubtitle: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.deleteNew.sub', {
          defaultMessage: 'Discard new control? Controls are not recoverable once discarded.',
        }),
      getConfirm: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.deleteNew.confirm', {
          defaultMessage: 'Discard',
        }),
      getCancel: () =>
        i18n.translate('presentationUtil.inputControls.controlGroup.management.deleteNew.cancel', {
          defaultMessage: 'Cancel',
        }),
    },
  },
  floatingActions: {
    getEditButtonTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.floatingActions.editTitle', {
        defaultMessage: 'Manage control',
      }),
    getRemoveButtonTitle: () =>
      i18n.translate('presentationUtil.inputControls.controlGroup.floatingActions.removeTitle', {
        defaultMessage: 'Remove control',
      }),
  },
};
