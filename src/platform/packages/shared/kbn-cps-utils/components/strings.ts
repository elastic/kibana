/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const strings = {
  allButtonLabel: () =>
    i18n.translate('cpsUtils.projectPicker.allButtonLabel', {
      defaultMessage: 'All',
    }),
  getProjectPickerButtonAriaLabel: () =>
    i18n.translate('cpsUtils.projectPicker.projectPickerButtonLabel', {
      defaultMessage: 'Cross-project search project picker',
    }),
  getProjectPickerButtonLabel: (numberOfProjects: number, totalProjects: number) =>
    i18n.translate('cpsUtils.projectPicker.originProjectTooltip', {
      defaultMessage:
        'Searching {numberOfProjects} of {totalProjects, plural, one {# project} other {# projects}}',
      values: {
        numberOfProjects,
        totalProjects,
      },
    }),
  getProjectPickerPopoverTitle: () =>
    i18n.translate('cpsUtils.projectPicker.projectPickerPopoverTitle', {
      defaultMessage: 'Cross-project search scope',
    }),
  getManageCrossProjectSearchLabel: () =>
    i18n.translate('cpsUtils.projectPicker.manageCrossProjectSearchLabel', {
      defaultMessage: 'Manage cross-project search',
    }),
  getOriginProjectLabel: () =>
    i18n.translate('cpsUtils.projectPicker.thisProjectLabel', {
      defaultMessage: 'This project',
    }),
  getProjectPickerTourTitle: () =>
    i18n.translate('cpsUtils.projectPicker.tour.title', {
      defaultMessage: 'Cross-project search now enabled',
    }),
  getProjectPickerTourContent: () =>
    i18n.translate('cpsUtils.projectPicker.tour.content', {
      defaultMessage:
        'By default, you will now be searching across this project’s data and all linked project data as configured for this space. You may further adjust the scope of your own cross-project search here.',
    }),
  getProjectPickerTourCloseButton: () =>
    i18n.translate('cpsUtils.projectPicker.tour.closeButton', {
      defaultMessage: 'Got it',
    }),
  getProjectPickerDisabledTooltip: () =>
    i18n.translate('cpsUtils.projectPicker.disabledTooltip', {
      defaultMessage:
        'Cross-project search is not available here. Unless otherwise informed, your project scope will be limited to this project alone.',
    }),
  getProjectPickerReadonlyCallout: () =>
    i18n.translate('cpsUtils.projectPicker.readonlyCallout', {
      defaultMessage: 'This page automatically inherits project scope from space defaults.',
    }),
  getProjectPickerReadonlyLensCallout: () =>
    i18n.translate('cpsUtils.projectPicker.readonlyLensCallout', {
      defaultMessage: 'Please adjust project scope for each layer in the Lens editor.',
    }),
};
