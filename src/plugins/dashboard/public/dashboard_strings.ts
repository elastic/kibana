/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import { ViewMode } from './services/embeddable';

/**
 * @param title {string} the current title of the dashboard
 * @param viewMode {DashboardViewMode} the current mode. If in editing state, prepends 'Editing ' to the title.
 * @param isDirty {boolean} if the dashboard is in a dirty state. If in dirty state, adds (unsaved) to the
 * end of the title.
 * @returns {string} A title to display to the user based on the above parameters.
 */
export function getDashboardTitle(
  title: string,
  viewMode: ViewMode,
  isDirty: boolean,
  isNew: boolean
): string {
  const isEditMode = viewMode === ViewMode.EDIT;
  let displayTitle: string;
  const newDashboardTitle = i18n.translate('dashboard.savedDashboard.newDashboardTitle', {
    defaultMessage: 'New Dashboard',
  });
  const dashboardTitle = isNew ? newDashboardTitle : title;

  if (isEditMode && isDirty) {
    displayTitle = i18n.translate('dashboard.strings.dashboardUnsavedEditTitle', {
      defaultMessage: 'Editing {title} (unsaved)',
      values: { title: dashboardTitle },
    });
  } else if (isEditMode) {
    displayTitle = i18n.translate('dashboard.strings.dashboardEditTitle', {
      defaultMessage: 'Editing {title}',
      values: { title: dashboardTitle },
    });
  } else {
    displayTitle = dashboardTitle;
  }

  return displayTitle;
}

/*
  Plugin
*/

export const dashboardBreadcrumb = i18n.translate('dashboard.dashboardAppBreadcrumbsTitle', {
  defaultMessage: 'Dashboard',
});

export const dashboardPageTitle = i18n.translate('dashboard.dashboardPageTitle', {
  defaultMessage: 'Dashboards',
});

export const dashboardFeatureCatalog = {
  getTitle: () =>
    i18n.translate('dashboard.featureCatalogue.dashboardTitle', {
      defaultMessage: 'Dashboard',
    }),
  getSubtitle: () =>
    i18n.translate('dashboard.featureCatalogue.dashboardSubtitle', {
      defaultMessage: 'Analyze data in dashboards.',
    }),
  getDescription: () =>
    i18n.translate('dashboard.featureCatalogue.dashboardDescription', {
      defaultMessage: 'Display and share a collection of visualizations and saved searches.',
    }),
};

/*
  Actions
*/
export const dashboardAddToLibraryAction = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.AddToLibrary', {
      defaultMessage: 'Add to library',
    }),
  getSuccessMessage: (panelTitle: string) =>
    i18n.translate('dashboard.panel.addToLibrary.successMessage', {
      defaultMessage: `Panel {panelTitle} was added to the visualize library`,
      values: { panelTitle },
    }),
};

export const dashboardClonePanelAction = {
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

export const dashboardExpandPanelAction = {
  getMinimizeTitle: () =>
    i18n.translate('dashboard.actions.toggleExpandPanelMenuItem.expandedDisplayName', {
      defaultMessage: 'Minimize',
    }),
  getMaximizeTitle: () =>
    i18n.translate('dashboard.actions.toggleExpandPanelMenuItem.notExpandedDisplayName', {
      defaultMessage: 'Maximize panel',
    }),
};

export const dashboardExportCsvAction = {
  getDisplayName: () =>
    i18n.translate('dashboard.actions.DownloadCreateDrilldownAction.displayName', {
      defaultMessage: 'Download as CSV',
    }),
  getUntitledFilename: () =>
    i18n.translate('dashboard.actions.downloadOptionsUnsavedFilename', {
      defaultMessage: 'unsaved',
    }),
};

export const dashboardUnlinkFromLibraryAction = {
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

export const dashboardLibraryNotification = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.LibraryNotification', {
      defaultMessage: 'Visualize Library Notification',
    }),
  getTooltip: () =>
    i18n.translate('dashboard.panel.libraryNotification.toolTip', {
      defaultMessage:
        'Editing this panel might affect other dashboards. To change to this panel only, unlink it from the library.',
    }),
  getPopoverAriaLabel: () =>
    i18n.translate('dashboard.panel.libraryNotification.ariaLabel', {
      defaultMessage: 'View library information and unlink this panel',
    }),
};

export const dashboardReplacePanelAction = {
  getDisplayName: () =>
    i18n.translate('dashboard.panel.removePanel.replacePanel', {
      defaultMessage: 'Replace panel',
    }),
  getSuccessMessage: (savedObjectName: string) =>
    i18n.translate('dashboard.addPanel.savedObjectAddedToContainerSuccessMessageTitle', {
      defaultMessage: '{savedObjectName} was added',
      values: {
        savedObjectName,
      },
    }),
  getNoMatchingObjectsMessage: () =>
    i18n.translate('dashboard.addPanel.noMatchingObjectsMessage', {
      defaultMessage: 'No matching objects found.',
    }),
};

/*
  Dashboard Editor
*/
export const shareModalStrings = {
  topMenuCheckbox: () =>
    i18n.translate('dashboard.embedUrlParamExtension.topMenu', {
      defaultMessage: 'Top menu',
    }),
  queryCheckbox: () =>
    i18n.translate('dashboard.embedUrlParamExtension.query', {
      defaultMessage: 'Query',
    }),
  timeFilterCheckbox: () =>
    i18n.translate('dashboard.embedUrlParamExtension.timeFilter', {
      defaultMessage: 'Time filter',
    }),
  filterBarCheckbox: () =>
    i18n.translate('dashboard.embedUrlParamExtension.filterBar', {
      defaultMessage: 'Filter bar',
    }),
  checkboxLegend: () =>
    i18n.translate('dashboard.embedUrlParamExtension.include', {
      defaultMessage: 'Include',
    }),
};

export const dashboard60Warning = i18n.translate('dashboard.urlWasRemovedInSixZeroWarningMessage', {
  defaultMessage: 'The url "dashboard/create" was removed in 6.0. Please update your bookmarks.',
});

export const dashboardReadonlyBadge = {
  text: i18n.translate('dashboard.badge.readOnly.text', {
    defaultMessage: 'Read only',
  }),
  tooltip: i18n.translate('dashboard.badge.readOnly.tooltip', {
    defaultMessage: 'Unable to save dashboards',
  }),
};

export const leaveConfirmStrings = {
  leaveTitle: i18n.translate('dashboard.appLeaveConfirmModal.unsavedChangesTitle', {
    defaultMessage: 'Unsaved changes',
  }),
  leaveSubtitle: i18n.translate('dashboard.appLeaveConfirmModal.unsavedChangesSubtitle', {
    defaultMessage: 'Leave Dashboard with unsaved work?',
  }),
  discardTitle: i18n.translate('dashboard.changeViewModeConfirmModal.discardChangesTitle', {
    defaultMessage: 'Discard changes to dashboard?',
  }),
  discardSubtitle: i18n.translate(
    'dashboard.changeViewModeConfirmModal.discardChangesDescription',
    {
      defaultMessage: `Once you discard your changes, there's no getting them back.`,
    }
  ),
  confirmButtonText: i18n.translate('dashboard.changeViewModeConfirmModal.confirmButtonLabel', {
    defaultMessage: 'Discard changes',
  }),
  cancelButtonText: i18n.translate('dashboard.changeViewModeConfirmModal.cancelButtonLabel', {
    defaultMessage: 'Continue editing',
  }),
};

/*
  Empty Screen
*/
export const emptyScreenStrings = {
  // Readonly Mode
  emptyDashboardTitle: i18n.translate('dashboard.emptyDashboardTitle', {
    defaultMessage: 'This dashboard is empty.',
  }),
  emptyDashboardAdditionalPrivilege: i18n.translate('dashboard.emptyDashboardAdditionalPrivilege', {
    defaultMessage: 'You need additional privileges to edit this dashboard.',
  }),

  // View Mode
  fillDashboardTitle: i18n.translate('dashboard.fillDashboardTitle', {
    defaultMessage: 'This dashboard is empty. Let\u2019s fill it up!',
  }),
  howToStartWorkingOnNewDashboardDescription1: i18n.translate(
    'dashboard.howToStartWorkingOnNewDashboardDescription1',
    {
      defaultMessage: 'Click',
    }
  ),
  howToStartWorkingOnNewDashboardDescription2: i18n.translate(
    'dashboard.howToStartWorkingOnNewDashboardDescription2',
    {
      defaultMessage: 'in the menu bar above to start adding panels.',
    }
  ),
  howToStartWorkingOnNewDashboardEditLinkText: i18n.translate(
    'dashboard.howToStartWorkingOnNewDashboardEditLinkText',
    {
      defaultMessage: 'Edit',
    }
  ),
  howToStartWorkingOnNewDashboardEditLinkAriaLabel: i18n.translate(
    'dashboard.howToStartWorkingOnNewDashboardEditLinkAriaLabel',
    {
      defaultMessage: 'Edit dashboard',
    }
  ),

  // Edit Mode
  addExistingVisualizationLinkText: i18n.translate('dashboard.addExistingVisualizationLinkText', {
    defaultMessage: 'Add an existing',
  }),
  addExistingVisualizationLinkAriaLabel: i18n.translate('dashboard.addVisualizationLinkAriaLabel', {
    defaultMessage: 'Add an existing visualization',
  }),
  addNewVisualizationDescription: i18n.translate('dashboard.addNewVisualizationText', {
    defaultMessage: 'or new object to this dashboard',
  }),
  createNewVisualizationButton: i18n.translate('dashboard.createNewVisualizationButton', {
    defaultMessage: 'Create new',
  }),
  createNewVisualizationButtonAriaLabel: i18n.translate(
    'dashboard.createNewVisualizationButtonAriaLabel',
    {
      defaultMessage: 'Create new visualization button',
    }
  ),
};

/*
  Dashboard Listing Page
*/
export const dashboardListingTable = {
  entityName: i18n.translate('dashboard.listing.table.entityName', {
    defaultMessage: 'dashboard',
  }),
  entityNamePlural: i18n.translate('dashboard.listing.table.entityNamePlural', {
    defaultMessage: 'dashboards',
  }),
  tableListTitle: i18n.translate('dashboard.listing.dashboardsTitle', {
    defaultMessage: 'Dashboards',
  }),
  tableCaption: i18n.translate('dashboard.listing.dashboardsTitle', {
    defaultMessage: 'Dashboards',
  }),
  titleColumnName: i18n.translate('dashboard.listing.table.titleColumnName', {
    defaultMessage: 'Title',
  }),
  descriptionColumnName: i18n.translate('dashboard.listing.table.descriptionColumnName', {
    defaultMessage: 'Description',
  }),
};
