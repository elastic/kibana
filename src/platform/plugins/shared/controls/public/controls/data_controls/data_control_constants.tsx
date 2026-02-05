/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';

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
      getTitleInputTitle: () =>
        i18n.translate('controls.controlGroup.manageControl.displaySettings.titleInputTitle', {
          defaultMessage: 'Label',
        }),
    },
    getSaveChangesTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.saveChangesTitle', {
        defaultMessage: 'Save',
      }),
    getOnSaveError: () =>
      i18n.translate('controls.controlGroup.manageControl.onSaveError', {
        defaultMessage: 'Error saving the control',
      }),
    getCancelTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.cancelTitle', {
        defaultMessage: 'Cancel',
      }),
    getAdditionalSettingsTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.additionalSettingsTitle', {
        defaultMessage: `Additional settings`,
      }),
    getUseGlobalFiltersTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.useGlobalFilters', {
        defaultMessage: 'Use global filters',
      }),
    getIgnoreValidationsTitle: () =>
      i18n.translate('controls.controlGroup.manageControl.ignoreValidations.title', {
        defaultMessage: 'Validate user selections',
      }),
    getIgnoreValidationsTooltip: () =>
      i18n.translate('controls.controlGroup.manageControl.ignoreValidations.tooltip', {
        defaultMessage: 'Highlight control selections that result in no data.',
      }),
  },
};
