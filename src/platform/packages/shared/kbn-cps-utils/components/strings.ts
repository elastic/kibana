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
};
