/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';

export const dashboardListingErrorStrings = {
  getErrorDeletingDashboardToast: () =>
    i18n.translate('dashboard.deleteError.toastDescription', {
      defaultMessage: 'Error encountered while deleting dashboard',
    }),
  getDuplicateTitleWarning: (value: string) =>
    i18n.translate('dashboard.dashboardListingEditErrorTitle.duplicateWarning', {
      defaultMessage: 'Saving "{value}" creates a duplicate title',
      values: {
        value,
      },
    }),
};

export const getNewDashboardTitle = () =>
  i18n.translate('dashboard.listing.newDashboardTitle', {
    defaultMessage: 'New Dashboard',
  });

export const dashboardListingTableStrings = {
  getEntityName: () =>
    i18n.translate('dashboard.listing.table.entityName', {
      defaultMessage: 'dashboard',
    }),
  getEntityNamePlural: () =>
    i18n.translate('dashboard.listing.table.entityNamePlural', {
      defaultMessage: 'dashboards',
    }),
  getTableListTitle: () =>
    i18n.translate('dashboard.listing.tableListTitle', {
      defaultMessage: 'Dashboards',
    }),
};

export const noItemsStrings = {
  getReadonlyTitle: () =>
    i18n.translate('dashboard.listing.readonlyNoItemsTitle', {
      defaultMessage: 'No dashboards to view',
    }),
  getReadonlyBody: () =>
    i18n.translate('dashboard.listing.readonlyNoItemsBody', {
      defaultMessage: `There are no available dashboards. To change your permissions to view the dashboards in this space, contact your administrator.`,
    }),
  getReadEditTitle: () =>
    i18n.translate('dashboard.listing.createNewDashboard.title', {
      defaultMessage: 'Create your first dashboard',
    }),
  getReadEditInProgressTitle: () =>
    i18n.translate('dashboard.listing.createNewDashboard.inProgressTitle', {
      defaultMessage: 'Dashboard in progress',
    }),
  getReadEditDashboardDescription: () =>
    i18n.translate('dashboard.listing.createNewDashboard.combineDataViewFromKibanaAppDescription', {
      defaultMessage:
        'Analyze all of your Elastic data in one place by creating a dashboard and adding visualizations.',
    }),
  getSampleDataLinkText: () =>
    i18n.translate('dashboard.listing.createNewDashboard.sampleDataInstallLinkText', {
      defaultMessage: `Add some sample data`,
    }),
  getCreateNewDashboardText: () =>
    i18n.translate('dashboard.listing.createNewDashboard.createButtonLabel', {
      defaultMessage: `Create a dashboard`,
    }),
};

export const dashboardUnsavedListingStrings = {
  getUnsavedChangesTitle: (plural = false) =>
    i18n.translate('dashboard.listing.unsaved.unsavedChangesTitle', {
      defaultMessage: 'You have unsaved changes in the following {dash}:',
      values: {
        dash: plural
          ? dashboardListingTableStrings.getEntityNamePlural()
          : dashboardListingTableStrings.getEntityName(),
      },
    }),
  getLoadingTitle: () =>
    i18n.translate('dashboard.listing.unsaved.loading', {
      defaultMessage: 'Loading',
    }),
  getEditAriaLabel: (title: string) =>
    i18n.translate('dashboard.listing.unsaved.editAria', {
      defaultMessage: 'Continue editing {title}',
      values: { title },
    }),
  getEditTitle: () =>
    i18n.translate('dashboard.listing.unsaved.editTitle', {
      defaultMessage: 'Continue editing',
    }),
  getDiscardAriaLabel: (title: string) =>
    i18n.translate('dashboard.listing.unsaved.resetAria', {
      defaultMessage: 'Reset changes to {title}',
      values: { title },
    }),
  getDiscardTitle: () =>
    i18n.translate('dashboard.listing.unsaved.resetTitle', {
      defaultMessage: 'Reset changes',
    }),
};

export const resetConfirmStrings = {
  getResetTitle: () =>
    i18n.translate('dashboard.resetChangesConfirmModal.resetChangesTitle', {
      defaultMessage: 'Reset dashboard?',
    }),
  getResetSubtitle: (viewMode: ViewMode) =>
    viewMode === ViewMode.EDIT
      ? i18n.translate('dashboard.discardChangesConfirmModal.discardChangesDescription', {
          defaultMessage: `All unsaved changes will be lost.`,
        })
      : i18n.translate('dashboard.resetChangesConfirmModal.resetChangesDescription', {
          defaultMessage: `This dashboard will return to its last saved state.  You might lose changes to filters and queries.`,
        }),
  getResetConfirmButtonText: () =>
    i18n.translate('dashboard.resetChangesConfirmModal.confirmButtonLabel', {
      defaultMessage: 'Reset dashboard',
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
