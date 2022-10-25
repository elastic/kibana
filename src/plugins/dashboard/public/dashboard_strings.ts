/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const getMigratedToastText = () =>
  i18n.translate('dashboard.migratedChanges', {
    defaultMessage: 'Some panels have been successfully updated to the latest version.',
  });

/*
  Dashboard Editor
*/

export const getDashboard60Warning = () =>
  i18n.translate('dashboard.urlWasRemovedInSixZeroWarningMessage', {
    defaultMessage: 'The url "dashboard/create" was removed in 6.0. Please update your bookmarks.',
  });

export const dashboardSaveToastStrings = {
  getSuccessString: (dashTitle: string) =>
    i18n.translate('dashboard.dashboardWasSavedSuccessMessage', {
      defaultMessage: `Dashboard '{dashTitle}' was saved`,
      values: { dashTitle },
    }),
  getFailureString: (dashTitle: string, errorMessage: string) =>
    i18n.translate('dashboard.dashboardWasNotSavedDangerMessage', {
      defaultMessage: `Dashboard '{dashTitle}' was not saved. Error: {errorMessage}`,
      values: {
        dashTitle,
        errorMessage,
      },
    }),
};

/*
  Modals
*/
export const shareModalStrings = {
  getTopMenuCheckbox: () =>
    i18n.translate('dashboard.embedUrlParamExtension.topMenu', {
      defaultMessage: 'Top menu',
    }),
  getQueryCheckbox: () =>
    i18n.translate('dashboard.embedUrlParamExtension.query', {
      defaultMessage: 'Query',
    }),
  getTimeFilterCheckbox: () =>
    i18n.translate('dashboard.embedUrlParamExtension.timeFilter', {
      defaultMessage: 'Time filter',
    }),
  getFilterBarCheckbox: () =>
    i18n.translate('dashboard.embedUrlParamExtension.filterBar', {
      defaultMessage: 'Filter bar',
    }),
  getCheckboxLegend: () =>
    i18n.translate('dashboard.embedUrlParamExtension.include', {
      defaultMessage: 'Include',
    }),
  getSnapshotShareWarning: () =>
    i18n.translate('dashboard.snapshotShare.longUrlWarning', {
      defaultMessage:
        'One or more panels on this dashboard have changed. Before you generate a snapshot, save the dashboard.',
    }),
};

export const leaveEditModeConfirmStrings = {
  getLeaveEditModeTitle: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.leaveEditModeTitle', {
      defaultMessage: 'You have unsaved changes',
    }),
  getLeaveEditModeSubtitle: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.description', {
      defaultMessage: `You can keep or discard your changes on return to view mode.  You can't recover discarded changes.`,
    }),
  getLeaveEditModeKeepChangesText: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.keepUnsavedChangesButtonLabel', {
      defaultMessage: 'Keep changes',
    }),
  getLeaveEditModeDiscardButtonText: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.confirmButtonLabel', {
      defaultMessage: 'Discard changes',
    }),
  getLeaveEditModeCancelButtonText: () =>
    i18n.translate('dashboard.changeViewModeConfirmModal.cancelButtonLabel', {
      defaultMessage: 'Continue editing',
    }),
};

export const discardConfirmStrings = {
  getDiscardTitle: () =>
    i18n.translate('dashboard.discardChangesConfirmModal.discardChangesTitle', {
      defaultMessage: 'Discard changes to dashboard?',
    }),
  getDiscardSubtitle: () =>
    i18n.translate('dashboard.discardChangesConfirmModal.discardChangesDescription', {
      defaultMessage: `Once you discard your changes, there's no getting them back.`,
    }),
  getDiscardConfirmButtonText: () =>
    i18n.translate('dashboard.discardChangesConfirmModal.confirmButtonLabel', {
      defaultMessage: 'Discard changes',
    }),
  getDiscardCancelButtonText: () =>
    i18n.translate('dashboard.discardChangesConfirmModal.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
};

export const createConfirmStrings = {
  getCreateTitle: () =>
    i18n.translate('dashboard.createConfirmModal.unsavedChangesTitle', {
      defaultMessage: 'New dashboard already in progress',
    }),
  getCreateSubtitle: () =>
    i18n.translate('dashboard.createConfirmModal.unsavedChangesSubtitle', {
      defaultMessage: 'Continue editing or start over with a blank dashboard.',
    }),
  getStartOverButtonText: () =>
    i18n.translate('dashboard.createConfirmModal.confirmButtonLabel', {
      defaultMessage: 'Start over',
    }),
  getContinueButtonText: () =>
    i18n.translate('dashboard.createConfirmModal.continueButtonLabel', {
      defaultMessage: 'Continue editing',
    }),
  getCancelButtonText: () =>
    i18n.translate('dashboard.createConfirmModal.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
};

/*
  Error Messages
*/
export const panelStorageErrorStrings = {
  getPanelsGetError: (message: string) =>
    i18n.translate('dashboard.panelStorageError.getError', {
      defaultMessage: 'Error encountered while fetching unsaved changes: {message}',
      values: { message },
    }),
  getPanelsSetError: (message: string) =>
    i18n.translate('dashboard.panelStorageError.setError', {
      defaultMessage: 'Error encountered while setting unsaved changes: {message}',
      values: { message },
    }),
  getPanelsClearError: (message: string) =>
    i18n.translate('dashboard.panelStorageError.clearError', {
      defaultMessage: 'Error encountered while clearing unsaved changes: {message}',
      values: { message },
    }),
};
