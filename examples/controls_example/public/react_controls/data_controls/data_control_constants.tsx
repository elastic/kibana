/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RANGE_SLIDER_CONTROL } from '@kbn/controls-plugin/common';
import { i18n } from '@kbn/i18n';

export const DataControlEditorStrings = {
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
      getDataViewListErrorTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.dataViewListErrorTitle', {
          defaultMessage: 'Error loading data views',
        }),
      getFieldTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.fieldTitle', {
          defaultMessage: 'Field',
        }),
      getFieldListErrorTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.dataSource.fieldListErrorTitle', {
          defaultMessage: 'Error loading the field list',
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
    getDeleteButtonTitle: () =>
      i18n.translate('controls.controlGroup.management.delete', {
        defaultMessage: 'Delete control',
      }),
  },
  management: {
    controlWidth: {
      getWidthSwitchLegend: () =>
        i18n.translate('controls.controlGroup.management.layout.controlWidthLegend', {
          defaultMessage: 'Change control size',
        }),
    },
  },
};
