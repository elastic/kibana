/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const exportReferencedObjectsStrings = {
  getMenuItemLabel: () =>
    i18n.translate('dashboard.exportReferencedObjects.menuItemLabel', {
      defaultMessage: 'Export with referenced objects',
    }),
  getFlyoutTitle: () =>
    i18n.translate('dashboard.exportReferencedObjects.flyoutTitle', {
      defaultMessage: 'Export with referenced objects',
    }),
  getTechnicalPreviewLabel: () =>
    i18n.translate('dashboard.exportReferencedObjects.technicalPreviewLabel', {
      defaultMessage: 'Technical preview',
    }),
  getTechnicalPreviewTooltip: () =>
    i18n.translate('dashboard.exportReferencedObjects.technicalPreviewTooltip', {
      defaultMessage:
        'This functionality is in technical preview and may be changed or removed in a future release.',
    }),
  getUnsavedTitle: () =>
    i18n.translate('dashboard.exportReferencedObjects.unsavedTitle', {
      defaultMessage: 'Save the dashboard first',
    }),
  getUnsavedText: () =>
    i18n.translate('dashboard.exportReferencedObjects.unsavedText', {
      defaultMessage: 'Only saved dashboards can be exported with their referenced objects.',
    }),
  getLoadingLabel: () =>
    i18n.translate('dashboard.exportReferencedObjects.loadingLabel', {
      defaultMessage: 'Preparing the export',
    }),
  getErrorTitle: () =>
    i18n.translate('dashboard.exportReferencedObjects.errorTitle', {
      defaultMessage: 'The dashboard could not be exported',
    }),
  getGenericErrorText: () =>
    i18n.translate('dashboard.exportReferencedObjects.genericErrorText', {
      defaultMessage: 'Something went wrong. Try again, or check the Kibana server logs.',
    }),
  getObjectsSummary: (count: number) =>
    i18n.translate('dashboard.exportReferencedObjects.objectsSummary', {
      defaultMessage: '{count, plural, one {# object} other {# objects}} will be exported.',
      values: { count },
    }),
  getObjectsTableCaption: () =>
    i18n.translate('dashboard.exportReferencedObjects.objectsTableCaption', {
      defaultMessage: 'Objects to export',
    }),
  getTypeColumnName: () =>
    i18n.translate('dashboard.exportReferencedObjects.typeColumnName', {
      defaultMessage: 'Type',
    }),
  getTitleColumnName: () =>
    i18n.translate('dashboard.exportReferencedObjects.titleColumnName', {
      defaultMessage: 'Title',
    }),
  getIdColumnName: () =>
    i18n.translate('dashboard.exportReferencedObjects.idColumnName', {
      defaultMessage: 'ID',
    }),
  getProblemsTitle: (count: number) =>
    i18n.translate('dashboard.exportReferencedObjects.problemsTitle', {
      defaultMessage:
        '{count, plural, one {# export problem} other {# export problems}}: these will be missing in the destination',
      values: { count },
    }),
  getProblemText: ({ type, id, message }: { type: string; id: string; message: string }) =>
    i18n.translate('dashboard.exportReferencedObjects.problemText', {
      defaultMessage: '{type} {id}: {message}',
      values: { type, id, message },
    }),
  getCloseButtonLabel: () =>
    i18n.translate('dashboard.exportReferencedObjects.closeButtonLabel', {
      defaultMessage: 'Close',
    }),
  getDownloadButtonLabel: () =>
    i18n.translate('dashboard.exportReferencedObjects.downloadButtonLabel', {
      defaultMessage: 'Download',
    }),
};
