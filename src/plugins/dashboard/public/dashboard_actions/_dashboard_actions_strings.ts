/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const dashboardCopyToDashboardActionStrings = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.copyToDashboard.title', {
      defaultMessage: 'Copy to dashboard',
    }),
  getCancelButtonName: () =>
    i18n.translate('dashboard.panel.copyToDashboard.cancel', {
      defaultMessage: 'Cancel',
    }),
  getAcceptButtonName: () =>
    i18n.translate('dashboard.panel.copyToDashboard.goToDashboard', {
      defaultMessage: 'Copy and go to dashboard',
    }),
  getNewDashboardOption: () =>
    i18n.translate('dashboard.panel.copyToDashboard.newDashboardOptionLabel', {
      defaultMessage: 'New dashboard',
    }),
  getExistingDashboardOption: () =>
    i18n.translate('dashboard.panel.copyToDashboard.existingDashboardOptionLabel', {
      defaultMessage: 'Existing dashboard',
    }),
  getDescription: () =>
    i18n.translate('dashboard.panel.copyToDashboard.description', {
      defaultMessage: 'Choose the destination dashboard.',
    }),
};

export const dashboardAddToLibraryActionStrings = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.AddToLibrary', {
      defaultMessage: 'Save to library',
    }),
  getSuccessMessage: (panelTitle: string) =>
    i18n.translate('dashboard.panel.addToLibrary.successMessage', {
      defaultMessage: `Panel {panelTitle} was added to the visualize library`,
      values: { panelTitle },
    }),
};

export const dashboardClonePanelActionStrings = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.clonePanel', {
      defaultMessage: 'Clone panel',
    }),
  getClonedTag: () =>
    i18n.translate('dashboard.panel.title.clonedTag', {
      defaultMessage: 'copy',
    }),
  getSuccessMessage: () =>
    i18n.translate('dashboard.panel.clonedToast', {
      defaultMessage: 'Cloned panel',
    }),
};

export const dashboardExpandPanelActionStrings = {
  getMinimizeTitle: () =>
    i18n.translate('dashboard.actions.toggleExpandPanelMenuItem.expandedDisplayName', {
      defaultMessage: 'Minimize',
    }),
  getMaximizeTitle: () =>
    i18n.translate('dashboard.actions.toggleExpandPanelMenuItem.notExpandedDisplayName', {
      defaultMessage: 'Maximize panel',
    }),
};

export const dashboardExportCsvActionStrings = {
  getDisplayName: () =>
    i18n.translate('dashboard.actions.DownloadCreateDrilldownAction.displayName', {
      defaultMessage: 'Download as CSV',
    }),
  getUntitledFilename: () =>
    i18n.translate('dashboard.actions.downloadOptionsUnsavedFilename', {
      defaultMessage: 'untitled',
    }),
};

export const dashboardUnlinkFromLibraryActionStrings = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.unlinkFromLibrary', {
      defaultMessage: 'Unlink from library',
    }),
  getSuccessMessage: (panelTitle: string) =>
    i18n.translate('dashboard.panel.unlinkFromLibrary.successMessage', {
      defaultMessage: `Panel {panelTitle} is no longer connected to the visualize library`,
      values: { panelTitle },
    }),
};

export const dashboardLibraryNotificationStrings = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.LibraryNotification', {
      defaultMessage: 'Visualize Library Notification',
    }),
  getTooltip: () =>
    i18n.translate('dashboard.panel.libraryNotification.toolTip', {
      defaultMessage:
        'Editing this panel might affect other dashboards. To change this panel only, unlink it from the library.',
    }),
  getPopoverAriaLabel: () =>
    i18n.translate('dashboard.panel.libraryNotification.ariaLabel', {
      defaultMessage: 'View library information and unlink this panel',
    }),
};

export const dashboardReplacePanelActionStrings = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.removePanel.replacePanel', {
      defaultMessage: 'Replace panel',
    }),
  getSuccessMessage: (savedObjectName?: string) =>
    savedObjectName
      ? i18n.translate('dashboard.addPanel.savedObjectAddedToContainerSuccessMessageTitle', {
          defaultMessage: '{savedObjectName} was added',
          values: {
            savedObjectName: `'${savedObjectName}'`,
          },
        })
      : i18n.translate('dashboard.addPanel.panelAddedToContainerSuccessMessageTitle', {
          defaultMessage: 'A panel was added',
        }),
  getNoMatchingObjectsMessage: () =>
    i18n.translate('dashboard.addPanel.noMatchingObjectsMessage', {
      defaultMessage: 'No matching objects found.',
    }),
};

export const dashboardFilterNotificationActionStrings = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.filters', {
      defaultMessage: 'Panel filters',
    }),
  getEditButtonTitle: () =>
    i18n.translate('dashboard.panel.filters.modal.editButton', {
      defaultMessage: 'Edit filters',
    }),
  getCloseButtonTitle: () =>
    i18n.translate('dashboard.panel.filters.modal.closeButton', {
      defaultMessage: 'Close',
    }),
  getQueryTitle: () =>
    i18n.translate('dashboard.panel.filters.modal.queryTitle', {
      defaultMessage: 'Query',
    }),
  getFiltersTitle: () =>
    i18n.translate('dashboard.panel.filters.modal.filtersTitle', {
      defaultMessage: 'Filters',
    }),
};
