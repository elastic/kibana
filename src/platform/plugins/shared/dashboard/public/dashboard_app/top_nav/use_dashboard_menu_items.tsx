/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useCallback, useMemo, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import useObservable from 'react-use/lib/useObservable';
import { openLazyFlyout } from '@kbn/presentation-util';
import type {
  AppMenuConfig,
  AppMenuItemType,
  AppMenuPrimaryActionItem,
  AppMenuRunActionParams,
} from '@kbn/core-chrome-app-menu-components';
import type { AppHeaderShareAction } from '@kbn/app-header';
import { useDashboardExportItems } from './share/use_dashboard_export_items';
import { getAccessControlClient } from '../../services/access_control_service';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { confirmDiscardUnsavedChanges } from '../../dashboard_listing/confirm_overlays';
import { openSettingsFlyout } from '../../dashboard_renderer/settings/open_settings_flyout';
import { getDashboardBackupService } from '../../services/dashboard_api_services';
import type { DashboardRedirect } from '../types';
import { coreServices, shareService, dataService } from '../../services/kibana_services';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import { getDashboardAccessControlState } from '../../utils/get_dashboard_access_control_state';
import { topNavStrings } from '../_dashboard_app_strings';
import { useShareOptions } from './share/use_share_options';
import { useDashboardInternalApi } from '../../dashboard_api/use_dashboard_internal_api';
import {
  dashboardClonePanelActionStrings,
  dashboardPanelContextMenuStrings,
} from '../../dashboard_actions/_dashboard_actions_strings';

const PRETTIFY_PANEL_WIDTH = 16;
const PRETTIFY_PANEL_HEIGHT = 10;
const PRETTIFY_PANELS_PER_ROW = 3; // 48 / 16

export const useDashboardMenuItems = ({
  redirectTo,
  showResetChange,
  shareAction,
}: {
  redirectTo: DashboardRedirect;
  showResetChange?: boolean;
  /** Used to build the menu Share item from the same action passed to App Header. */
  shareAction?: AppHeaderShareAction;
}) => {
  const isMounted = useMountedState();
  const accessControlClient = getAccessControlClient();
  const appId = useObservable(coreServices.application.currentAppId$);

  const [isSaveInProgress, setIsSaveInProgress] = useState(false);

  const dashboardApi = useDashboardApi();
  const dashboardInternalApi = useDashboardInternalApi();

  const [
    hasOverlays,
    hasUnsavedChanges,
    lastSavedId,
    viewMode,
    accessControl,
    canRedo,
    canUndo,
    selectedPanelIds,
  ] = useBatchedPublishingSubjects(
    dashboardApi.hasOverlays$,
    dashboardApi.hasUnsavedChanges$,
    dashboardApi.savedObjectId$,
    dashboardApi.viewMode$,
    dashboardApi.accessControl$,
    dashboardInternalApi.canRedo$,
    dashboardInternalApi.canUndo$,
    dashboardApi.selectedPanelIds$
  );

  const disableTopNav = isSaveInProgress || hasOverlays;
  const { isInEditAccessMode, canManageAccessControl } = useMemo(
    () =>
      getDashboardAccessControlState({
        accessControlClient,
        accessControl,
        createdBy: dashboardApi.createdBy,
        user: dashboardApi.user,
      }),
    [accessControl, accessControlClient, dashboardApi.createdBy, dashboardApi.user]
  );

  const isEditButtonDisabled = useMemo(() => {
    if (disableTopNav) return true;
    if (canManageAccessControl) return false;
    return !isInEditAccessMode;
  }, [disableTopNav, isInEditAccessMode, canManageAccessControl]);

  /**
   * Show the dashboard's "Confirm reset changes" modal. If confirmed:
   * (1) reset the dashboard to the last saved state, and
   * (2) if `switchToViewMode` is `true`, set the dashboard to view mode.
   */
  const [isResetting, setIsResetting] = useState(false);

  const isQuickSaveButtonDisabled = useMemo(() => {
    if (disableTopNav || isResetting) return true;
    if (dashboardApi.isAccessControlEnabled) {
      if (canManageAccessControl) return false;
      return !isInEditAccessMode;
    }
    return false;
  }, [
    canManageAccessControl,
    isInEditAccessMode,
    isResetting,
    dashboardApi.isAccessControlEnabled,
    disableTopNav,
  ]);

  const resetChanges = useCallback(
    (switchToViewMode: boolean = false) => {
      dashboardApi.clearOverlays();
      const switchModes = switchToViewMode
        ? () => {
            dashboardApi.setViewMode('view');
            getDashboardBackupService().storeViewMode('view');
          }
        : undefined;
      if (!hasUnsavedChanges) {
        switchModes?.();
        return;
      }
      confirmDiscardUnsavedChanges(async () => {
        setIsResetting(true);
        await dashboardApi.asyncResetToLastSavedState();
        if (isMounted()) {
          setIsResetting(false);
          switchModes?.();
        }
      }, viewMode);
    },
    [dashboardApi, hasUnsavedChanges, viewMode, isMounted]
  );

  /**
   * initiate interactive dashboard copy action
   */
  const dashboardInteractiveSave = useCallback(async () => {
    await dashboardApi.runInteractiveSave(redirectTo);
  }, [redirectTo, dashboardApi]);

  /**
   * Save the dashboard without any UI or popups.
   */
  const quickSaveDashboard = useCallback(() => {
    setIsSaveInProgress(true);
    dashboardApi.runQuickSave().then(() =>
      setTimeout(() => {
        setIsSaveInProgress(false);
      }, 100)
    );
  }, [dashboardApi]);

  const openAddPanelFlyout = useCallback(
    (params?: AppMenuRunActionParams) => {
      openLazyFlyout({
        core: coreServices,
        parentApi: dashboardApi,
        returnFocus: params?.returnFocus,
        loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
          const { AddPanelFlyout } = await import('./add_panel_button/components/add_panel_flyout');

          return (
            <AddPanelFlyout
              dashboardApi={dashboardApi}
              ariaLabelledBy={ariaLabelledBy}
              returnFocus={params?.returnFocus}
            />
          );
        },
        flyoutProps: {
          'data-test-subj': 'dashboardAddPanel',
        },
      });
    },
    [dashboardApi]
  );

  const shareOptions = useShareOptions();

  const exportItems = useDashboardExportItems(shareOptions);

  const hasExportMenuItems = exportItems.length > 0;

  const getEditTooltip = useCallback(() => {
    if (dashboardApi.isManaged) {
      return topNavStrings.edit.managedDashboardTooltip;
    }
    if (isInEditAccessMode || canManageAccessControl) {
      return undefined;
    }
    return topNavStrings.edit.writeRestrictedTooltip;
  }, [isInEditAccessMode, canManageAccessControl, dashboardApi.isManaged]);

  const resetChangesMenuItem = useMemo(() => {
    return {
      order: viewMode === 'edit' ? 2 : 4,
      label: topNavStrings.resetChanges.label,
      id: 'reset',
      testId: 'dashboardDiscardChangesMenuItem',
      iconType: 'undo',
      disableButton:
        isResetting ||
        !hasUnsavedChanges ||
        hasOverlays ||
        (viewMode === 'edit' && (isSaveInProgress || !lastSavedId)) ||
        !lastSavedId, // Disable when on a new dashboard
      isLoading: isResetting,
      run: () => resetChanges(),
    };
  }, [
    hasOverlays,
    lastSavedId,
    resetChanges,
    viewMode,
    isSaveInProgress,
    hasUnsavedChanges,
    isResetting,
  ]);

  const historyConfig = useMemo(() => {
    return {
      undo: {
        disabled: disableTopNav || !canUndo,
        onClick: () => {
          dashboardInternalApi.undo();
        },
      },
      redo: {
        disabled: disableTopNav || !canRedo,
        onClick: async () => {
          dashboardInternalApi.redo();
        },
      },
    };
  }, [disableTopNav, canRedo, canUndo, dashboardInternalApi]);

  const prettifyDashboard = useCallback(() => {
    const layout = dashboardApi.layout$.getValue();
    const panelIds = Object.keys(layout.panels).sort((a, b) => {
      const ga = layout.panels[a].grid;
      const gb = layout.panels[b].grid;
      const ya = ga.y ?? 0;
      const yb = gb.y ?? 0;
      if (ya !== yb) return ya - yb;
      return (ga.x ?? 0) - (gb.x ?? 0);
    });
    const newPanels = { ...layout.panels };
    panelIds.forEach((id, index) => {
      const col = index % PRETTIFY_PANELS_PER_ROW;
      const row = Math.floor(index / PRETTIFY_PANELS_PER_ROW);
      newPanels[id] = {
        ...layout.panels[id],
        grid: {
          x: col * PRETTIFY_PANEL_WIDTH,
          y: row * PRETTIFY_PANEL_HEIGHT,
          w: PRETTIFY_PANEL_WIDTH,
          h: PRETTIFY_PANEL_HEIGHT,
        },
      };
    });
    dashboardApi.layout$.next({ ...layout, panels: newPanels });
  }, [dashboardApi]);

  /**
   * Register all of the top nav configs that can be used by dashboard.
   */

  const menuItems = useMemo(() => {
    const exportMenuItem: AppMenuItemType =
      exportItems.length === 1
        ? {
            order: viewMode === 'edit' ? 4 : 2,
            label: topNavStrings.export.label,
            id: 'export',
            iconType: 'upload',
            testId: 'exportTopNavButton',
            disableButton: disableTopNav,
            run: (params) => exportItems[0].run?.(params),
          }
        : {
            order: viewMode === 'edit' ? 4 : 2,
            label: topNavStrings.export.label,
            id: 'export',
            iconType: 'upload',
            testId: 'exportTopNavButton',
            disableButton: disableTopNav,
            items: exportItems,
            popoverWidth: 160,
            popoverTestId: 'exportPopoverPanel',
          };

    return {
      // Regular menu items
      share: {
        order: viewMode === 'edit' ? 3 : 1,
        label: topNavStrings.share.label,
        tooltipContent: shareAction?.tooltip?.content,
        tooltipTitle: shareAction?.tooltip?.title,
        id: 'share',
        iconType: 'share',
        testId: 'shareTopNavButton',
        disableButton: shareAction?.isDisabled ?? disableTopNav,
        run: (params) => {
          if (!shareAction) {
            return;
          }
          void shareAction.onClick({
            returnFocus: params?.returnFocus ?? (() => params?.triggerElement?.focus()),
          });
        },
      } as AppMenuItemType,

      export: exportMenuItem,

      duplicate: {
        order: 3,
        disableButton: disableTopNav,
        id: 'interactive-save',
        testId: 'dashboardInteractiveSaveMenuItem',
        iconType: 'copy',
        run: dashboardInteractiveSave,
        label: topNavStrings.viewModeInteractiveSave.label,
      } as AppMenuItemType,

      backgroundSearch: {
        order: viewMode === 'edit' ? 6 : 5,
        label: topNavStrings.backgroundSearch.label,
        id: 'backgroundSearch',
        iconType: 'backgroundTask',
        testId: 'openBackgroundSearchFlyoutButton',
        run: () =>
          dataService.search.showSearchSessionsFlyout({
            appId: appId!,
            trackingProps: { openedFrom: 'background search button' },
          }),
      } as AppMenuItemType,

      prettifyDashboard: {
        order: 8,
        label: topNavStrings.prettifyDashboard.label,
        id: 'prettifyDashboard',
        iconType: 'grid',
        testId: 'dashboardPrettifyDashboard',
        disableButton: disableTopNav,
        run: prettifyDashboard,
      } as AppMenuItemType,

      duplicateSelectedPanels: {
        order: 9,
        label: dashboardClonePanelActionStrings.getDisplayName(),
        id: 'duplicateSelectedPanels',
        iconType: 'copy',
        testId: 'dashboardDuplicateSelectedPanels',
        disableButton: disableTopNav || (selectedPanelIds ?? new Set()).size === 0,
        run: async () => {
          const ids = Array.from(selectedPanelIds ?? new Set<string>());
          for (const id of ids) {
            try {
              await dashboardApi.duplicatePanel(id);
            } catch {
              // skip if panel no longer exists
            }
          }
        },
      } as AppMenuItemType,

      removeSelectedPanels: {
        order: 10,
        label: dashboardPanelContextMenuStrings.getRemoveLabel(),
        id: 'removeSelectedPanels',
        iconType: 'trash',
        testId: 'dashboardRemoveSelectedPanels',
        disableButton: disableTopNav || (selectedPanelIds ?? new Set()).size === 0,
        run: () => {
          const ids = selectedPanelIds ?? new Set<string>();
          ids.forEach((id) => {
            try {
              dashboardApi.removePanel(id);
            } catch {
              // skip
            }
          });
          const nextSelected = new Set(ids);
          ids.forEach((id) => nextSelected.delete(id));
          dashboardApi.setSelectedPanelIds(nextSelected);
        },
      } as AppMenuItemType,

      groupSelectedPanels: {
        order: 11,
        label: dashboardPanelContextMenuStrings.getGroupLabel(),
        id: 'groupSelectedPanels',
        iconType: 'folderClosed',
        testId: 'dashboardGroupSelectedPanels',
        disableButton:
          disableTopNav || (selectedPanelIds ?? new Set()).size < 2,
        run: () => {
          const ids = selectedPanelIds ?? new Set<string>();
          if (ids.size < 2) return;
          dashboardApi.movePanelsToNewSection(Array.from(ids));
        },
      } as AppMenuItemType,

      fullScreen: {
        order: 6,
        label: topNavStrings.fullScreen.label,
        id: 'full-screen',
        testId: 'dashboardFullScreenMode',
        iconType: 'fullScreen',
        run: () => dashboardApi.setFullScreenMode(true),
        disableButton: disableTopNav,
      } as AppMenuItemType,

      switchToViewMode: {
        order: 1,
        iconType: 'logOut',
        label: topNavStrings.switchToViewMode.label,
        id: 'cancel',
        disableButton: disableTopNav || !lastSavedId || isResetting,
        isLoading: isResetting,
        testId: 'dashboardViewOnlyMode',
        run: () => resetChanges(true),
      } as AppMenuItemType,

      add: {
        label: topNavStrings.add.label,
        id: 'add',
        iconType: 'plus',
        testId: 'dashboardAddTopNavButton',
        htmlId: 'dashboardAddTopNavButton',
        disableButton: disableTopNav,
        run: openAddPanelFlyout,
        order: 2,
      } as AppMenuItemType,

      settings: {
        order: 5,
        iconType: 'gear',
        label: topNavStrings.settings.label,
        id: 'settings',
        testId: 'dashboardSettingsButton',
        disableButton: disableTopNav,
        htmlId: 'dashboardSettingsButton',
        run: (params) => openSettingsFlyout(dashboardApi, params?.returnFocus),
      } as AppMenuItemType,

      // Action items
      edit: {
        label: topNavStrings.edit.label,
        id: 'edit',
        iconType: 'pencil',
        testId: 'dashboardEditMode',
        hidden: ['s', 'xs'], // hide for small screens - editing doesn't work in mobile mode.
        run: () => {
          getDashboardBackupService().storeViewMode('edit');
          dashboardApi.setViewMode('edit');
          dashboardApi.clearOverlays();
        },
        disableButton: isEditButtonDisabled,
        tooltipContent: getEditTooltip(),
        color: 'text',
      } as AppMenuPrimaryActionItem,

      save: {
        label: topNavStrings.quickSave.label,
        id: 'save',
        iconType: 'save',
        testId: lastSavedId ? 'dashboardQuickSaveMenuItem' : 'dashboardInteractiveSaveMenuItem',
        disableButton: lastSavedId ? isQuickSaveButtonDisabled : disableTopNav, // Only check disableTopNav for new dashboards
        run: () => (lastSavedId ? quickSaveDashboard() : dashboardInteractiveSave()),
        popoverWidth: 150,
        splitButtonProps: {
          items: [
            {
              id: 'save-as',
              label: topNavStrings.editModeInteractiveSave.label,
              iconType: 'save',
              order: 1,
              testId: 'dashboardInteractiveSaveMenuItem',
              disableButton: isSaveInProgress || !lastSavedId, // Disable when on a new dashboard
              run: () => dashboardInteractiveSave(),
            },
            resetChangesMenuItem,
          ],
          isMainButtonLoading: isSaveInProgress,
          secondaryButtonAriaLabel: topNavStrings.saveMenu.label,
          isSecondaryButtonDisabled: isSaveInProgress,
          notificationIndicatorTooltipContent: topNavStrings.unsavedChangesTooltip,
          showNotificationIndicator: hasUnsavedChanges,
        },
      } as AppMenuPrimaryActionItem,
    };
  }, [
    disableTopNav,
    isSaveInProgress,
    lastSavedId,
    dashboardInteractiveSave,
    shareAction,
    dashboardApi,
    quickSaveDashboard,
    resetChanges,
    isResetting,
    isEditButtonDisabled,
    getEditTooltip,
    appId,
    isQuickSaveButtonDisabled,
    hasUnsavedChanges,
    openAddPanelFlyout,
    resetChangesMenuItem,
    exportItems,
    viewMode,
    prettifyDashboard,
    selectedPanelIds,
  ]);

  /**
   * Build ordered menus for view and edit mode.
   */
  const viewModeTopNavConfig = useMemo(() => {
    const { showWriteControls, storeSearchSession } = getDashboardCapabilities();

    const items: AppMenuItemType[] = [menuItems.fullScreen];

    if (showWriteControls) {
      items.push(menuItems.duplicate);
    }

    if (shareAction) {
      items.push(menuItems.share);
      if (hasExportMenuItems) {
        // only render the export button if we have integrations
        items.push(menuItems.export);
      }
    } else if (shareService && hasExportMenuItems) {
      items.push(menuItems.export);
    }

    if (showResetChange) {
      items.push(resetChangesMenuItem);
    }

    if (storeSearchSession && dataService.search.isBackgroundSearchEnabled) {
      items.push(menuItems.backgroundSearch);
    }

    const viewModeConfig: AppMenuConfig = {
      items,
    };

    if (showWriteControls && !dashboardApi.isManaged) {
      viewModeConfig.primaryActionItem = menuItems.edit;
    }

    return { ...viewModeConfig, historyConfig };
  }, [
    menuItems.fullScreen,
    menuItems.duplicate,
    menuItems.export,
    menuItems.share,
    menuItems.edit,
    menuItems.backgroundSearch,
    resetChangesMenuItem,
    dashboardApi.isManaged,
    showResetChange,
    hasExportMenuItems,
    historyConfig,
    shareAction,
  ]);

  const editModeTopNavConfig = useMemo(() => {
    const { storeSearchSession } = getDashboardCapabilities();

    const items: AppMenuItemType[] = [
      menuItems.add,
      menuItems.switchToViewMode,
      menuItems.settings,
    ];

    if (shareAction) {
      items.push(menuItems.share);
      if (hasExportMenuItems) {
        // only render the export button if we have integrations
        items.push(menuItems.export);
      }
    } else if (shareService && hasExportMenuItems) {
      items.push(menuItems.export);
    }

    if (storeSearchSession && dataService.search.isBackgroundSearchEnabled) {
      items.push(menuItems.backgroundSearch);
    }

    items.push(menuItems.prettifyDashboard);
    items.push(menuItems.duplicateSelectedPanels);
    items.push(menuItems.removeSelectedPanels);
    items.push(menuItems.groupSelectedPanels);

    const editModeConfig: AppMenuConfig = {
      items,
      primaryActionItem: menuItems.save,
    };

    return { ...editModeConfig, historyConfig };
  }, [
    menuItems.switchToViewMode,
    menuItems.export,
    menuItems.share,
    menuItems.settings,
    menuItems.backgroundSearch,
    menuItems.prettifyDashboard,
    menuItems.duplicateSelectedPanels,
    menuItems.removeSelectedPanels,
    menuItems.groupSelectedPanels,
    menuItems.save,
    menuItems.add,
    hasExportMenuItems,
    historyConfig,
    shareAction,
  ]);

  return { viewModeTopNavConfig, editModeTopNavConfig };
};
