/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch, SetStateAction } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import useObservable from 'react-use/lib/useObservable';
import type {
  AppMenuConfig,
  AppMenuItemType,
  AppMenuPrimaryActionItem,
  AppMenuSecondaryActionItem,
} from '@kbn/core-chrome-app-menu-components';
import { i18n } from '@kbn/i18n';
import { useDashboardExportItems } from './share/use_dashboard_export_items';
import { getAccessControlClient } from '../../services/access_control_service';
import { UI_SETTINGS } from '../../../common/constants';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { confirmDiscardUnsavedChanges } from '../../dashboard_listing/confirm_overlays';
import { openSettingsFlyout } from '../../dashboard_renderer/settings/open_settings_flyout';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import type { SaveDashboardReturn } from '../../dashboard_api/save_modal/types';
import { coreServices, shareService, dataService } from '../../services/kibana_services';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import { topNavStrings, getCreateVisualizationButtonTitle } from '../_dashboard_app_strings';
import { ShowShareModal } from './share/show_share_modal';
import {
  executeCreateTimeSliderControlPanelAction,
  isTimeSliderControlCreationCompatible,
} from '../../dashboard_actions/execute_create_time_slider_control_panel_action';
import { executeCreateControlPanelAction } from '../../dashboard_actions/execute_create_control_panel_action';
import { executeCreateESQLControlPanelAction } from '../../dashboard_actions/execute_create_esql_control_panel_action';
import { executeAddLensPanelAction } from '../../dashboard_actions/execute_add_lens_panel_action';
import { addFromLibrary } from '../../dashboard_renderer/add_panel_from_library';

export const useDashboardMenuItems = ({
  isLabsShown,
  setIsLabsShown,
  maybeRedirect,
  showResetChange,
}: {
  isLabsShown: boolean;
  setIsLabsShown: Dispatch<SetStateAction<boolean>>;
  maybeRedirect: (result?: SaveDashboardReturn) => void;
  showResetChange?: boolean;
}) => {
  const isMounted = useMountedState();
  const accessControlClient = getAccessControlClient();
  const appId = useObservable(coreServices.application.currentAppId$);

  const [isSaveInProgress, setIsSaveInProgress] = useState(false);
  const [canCreateTimeSlider, setCanCreateTimeSlider] = useState(false);

  const dashboardApi = useDashboardApi();

  const [dashboardTitle, hasOverlays, hasUnsavedChanges, lastSavedId, viewMode, accessControl] =
    useBatchedPublishingSubjects(
      dashboardApi.title$,
      dashboardApi.hasOverlays$,
      dashboardApi.hasUnsavedChanges$,
      dashboardApi.savedObjectId$,
      dashboardApi.viewMode$,
      dashboardApi.accessControl$
    );

  const disableTopNav = isSaveInProgress || hasOverlays;
  const isInEditAccessMode = accessControlClient.isInEditAccessMode(accessControl);
  const canManageAccessControl = useMemo(() => {
    const userAccessControl = accessControlClient.checkUserAccessControl({
      accessControl,
      createdBy: dashboardApi.createdBy,
      userId: dashboardApi.user?.uid,
    });
    return dashboardApi?.user?.hasGlobalAccessControlPrivilege || userAccessControl;
  }, [accessControl, accessControlClient, dashboardApi.createdBy, dashboardApi.user]);

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
    const result = await dashboardApi.runInteractiveSave();
    maybeRedirect(result);
    if (result && !result.error) {
      return result;
    }
  }, [maybeRedirect, dashboardApi]);

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

  const saveFromShareModal = useCallback(async () => {
    if (lastSavedId) {
      quickSaveDashboard();
    } else {
      dashboardInteractiveSave();
    }
  }, [quickSaveDashboard, dashboardInteractiveSave, lastSavedId]);

  const exportItems = useDashboardExportItems({
    dashboardApi,
    objectId: lastSavedId,
    isDirty: Boolean(hasUnsavedChanges),
    dashboardTitle,
  });

  /**
   * Show the Dashboard app's share menu
   */
  const showShare = useCallback(() => {
    ShowShareModal({
      dashboardTitle,
      savedObjectId: lastSavedId,
      isDirty: Boolean(hasUnsavedChanges),
      canSave: (canManageAccessControl || isInEditAccessMode) && Boolean(hasUnsavedChanges),
      accessControl,
      createdBy: dashboardApi.createdBy,
      isManaged: dashboardApi.isManaged,
      accessControlClient,
      saveDashboard: saveFromShareModal,
      changeAccessMode: dashboardApi.changeAccessMode,
    });
  }, [
    dashboardTitle,
    hasUnsavedChanges,
    lastSavedId,
    isInEditAccessMode,
    canManageAccessControl,
    accessControl,
    saveFromShareModal,
    dashboardApi.changeAccessMode,
    dashboardApi.createdBy,
    accessControlClient,
    dashboardApi.isManaged,
  ]);

  const getEditTooltip = useCallback(() => {
    if (dashboardApi.isManaged) {
      return topNavStrings.edit.managedDashboardTooltip;
    }
    if (isInEditAccessMode || canManageAccessControl) {
      return undefined;
    }
    return topNavStrings.edit.writeRestrictedTooltip;
  }, [isInEditAccessMode, canManageAccessControl, dashboardApi.isManaged]);

  const getShareTooltip = useCallback(() => {
    if (!dashboardApi.isAccessControlEnabled) return undefined;
    return isInEditAccessMode
      ? topNavStrings.share.editModeTooltipContent
      : topNavStrings.share.writeRestrictedModeTooltipContent;
  }, [isInEditAccessMode, dashboardApi.isAccessControlEnabled]);

  const openAddPanelFlyout = useCallback(async () => {
    const { openLazyFlyout: openFlyout } = await import('@kbn/presentation-util');
    openFlyout({
      core: coreServices,
      parentApi: dashboardApi,
      loadContent: async ({ closeFlyout, ariaLabelledBy }: any) => {
        const { AddPanelFlyout } = await import('./add_panel_button/components/add_panel_flyout');
        return (
          <AddPanelFlyout
            dashboardApi={dashboardApi}
            closeFlyout={closeFlyout}
            ariaLabelledBy={ariaLabelledBy}
          />
        );
      },
      flyoutProps: {
        'data-test-subj': 'dashboardPanelSelectionFlyout',
        triggerId: 'dashboardAddTopNavButton',
      },
    });
  }, [dashboardApi]);

  const addMenuItems = useMemo(() => {
    const controlItems: AppMenuItemType[] = [
      {
        id: 'control',
        label: i18n.translate('dashboard.solutionToolbar.addControlButtonLabel', {
          defaultMessage: 'Control',
        }),
        iconType: 'empty',
        order: 1,
        testId: 'controls-create-button',
        run: () => executeCreateControlPanelAction(dashboardApi),
      } as AppMenuItemType,
      {
        id: 'variableControl',
        label: i18n.translate('dashboard.solutionToolbar.addESQLControlButtonLabel', {
          defaultMessage: 'Variable control',
        }),
        iconType: 'empty',
        order: 2,
        testId: 'esql-control-create-button',
        run: () => executeCreateESQLControlPanelAction(dashboardApi),
      } as AppMenuItemType,
      {
        id: 'timeSliderControl',
        label: i18n.translate('dashboard.solutionToolbar.addTimeSliderControlButtonLabel', {
          defaultMessage: 'Time slider control',
        }),
        iconType: 'empty',
        order: 3,
        testId: 'controls-create-timeslider-button',
        disableButton: !canCreateTimeSlider,
        tooltipContent: canCreateTimeSlider
          ? undefined
          : i18n.translate('dashboard.timeSlider.disabledTooltip', {
              defaultMessage: 'Only one time slider control can be added per dashboard.',
            }),
        run: () => executeCreateTimeSliderControlPanelAction(dashboardApi),
      } as AppMenuItemType,
    ];

    return [
      {
        id: 'createVisualization',
        label: getCreateVisualizationButtonTitle(),
        iconType: 'lensApp',
        order: 1,
        testId: 'dashboardCreateNewVisButton',
        run: () => executeAddLensPanelAction(dashboardApi),
      } as AppMenuItemType,
      {
        id: 'newPanel',
        label: i18n.translate('dashboard.solutionToolbar.editorMenuButtonLabel', {
          defaultMessage: 'New panel',
        }),
        iconType: 'plusInCircle',
        order: 2,
        testId: 'dashboardOpenAddPanelFlyoutButton',
        run: openAddPanelFlyout,
      } as AppMenuItemType,
      {
        id: 'collapsibleSection',
        label: i18n.translate('dashboard.solutionToolbar.addSectionButtonLabel', {
          defaultMessage: 'Collapsible section',
        }),
        iconType: 'section',
        order: 3,
        testId: 'dashboardAddCollapsibleSectionButton',
        run: () => dashboardApi.addNewSection(),
      } as AppMenuItemType,
      {
        id: 'controls',
        label: i18n.translate('dashboard.solutionToolbar.controlsMenuButtonLabel', {
          defaultMessage: 'Controls',
        }),
        iconType: 'controlsHorizontal',
        order: 4,
        testId: 'dashboard-controls-menu-button',
        items: controlItems,
      } as AppMenuItemType,
      {
        id: 'fromLibrary',
        label: i18n.translate('dashboard.buttonToolbar.buttons.addFromLibrary.libraryButtonLabel', {
          defaultMessage: 'From library',
        }),
        iconType: 'folderOpen',
        order: 5,
        testId: 'dashboardAddFromLibraryButton',
        run: () => addFromLibrary(dashboardApi),
      } as AppMenuItemType,
    ];
  }, [dashboardApi, openAddPanelFlyout, canCreateTimeSlider]);

  const resetChangesMenuItem = useMemo(() => {
    return {
      order: viewMode === 'edit' ? 2 : 4,
      label: topNavStrings.resetChanges.label,
      id: 'reset',
      testId: 'dashboardDiscardChangesMenuItem',
      iconType: 'editorUndo',
      disableButton:
        isResetting ||
        !hasUnsavedChanges ||
        hasOverlays ||
        (viewMode === 'edit' && (isSaveInProgress || !lastSavedId)),
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

  /**
   * Register all of the top nav configs that can be used by dashboard.
   */

  const menuItems = useMemo(() => {
    return {
      fullScreen: {
        order: 1,
        label: topNavStrings.fullScreen.label,
        id: 'full-screen',
        testId: 'dashboardFullScreenMode',
        iconType: 'fullScreen',
        run: () => dashboardApi.setFullScreenMode(true),
        disableButton: disableTopNav,
      } as AppMenuItemType,

      labs: {
        label: topNavStrings.labs.label,
        id: 'labs',
        testId: 'dashboardLabs',
        run: () => setIsLabsShown(!isLabsShown),
      } as AppMenuItemType,

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
      } as AppMenuSecondaryActionItem,

      quickSave: {
        label: topNavStrings.quickSave.label,
        id: 'quick-save',
        iconType: 'save',
        testId: 'dashboardQuickSaveMenuItem',
        disableButton: isQuickSaveButtonDisabled,
        run: () => quickSaveDashboard(),
        popoverWidth: 150,
        splitButtonProps: {
          items: [
            {
              id: 'save-as',
              label: i18n.translate('dashboard.topNav.saveAsButtonLabel', {
                defaultMessage: 'Save as',
              }),
              iconType: 'save',
              order: 1,
              testId: 'dashboardSaveAsMenuItem',
              disableButton: isSaveInProgress,
              run: () => dashboardInteractiveSave(),
            },
            resetChangesMenuItem,
          ],
          isMainButtonLoading: isSaveInProgress,
          isMainButtonDisabled: !hasUnsavedChanges,
          secondaryButtonAriaLabel: topNavStrings.saveMenu.label,
          secondaryButtonIcon: 'arrowDown',
          secondaryButtonFill: true,
          isSecondaryButtonDisabled: isSaveInProgress,
          notifcationIndicatorTooltipContent: i18n.translate(
            'dashboard.topNav.unsavedChangesTooltip',
            {
              defaultMessage: 'You have unsaved changes',
            }
          ),
          showNotificationIndicator: hasUnsavedChanges,
        },
      } as AppMenuPrimaryActionItem,

      interactiveSave: {
        order: 2,
        disableButton: disableTopNav,
        id: 'interactive-save',
        testId: 'dashboardInteractiveSaveMenuItem',
        iconType: 'copy',
        run: dashboardInteractiveSave,
        label: topNavStrings.viewModeInteractiveSave.label,
      } as AppMenuItemType,

      switchToViewMode: {
        order: 1,
        iconType: 'exit', // use 'logOut' when added to EUI
        label: topNavStrings.switchToViewMode.label,
        id: 'cancel',
        disableButton: disableTopNav || !lastSavedId || isResetting,
        isLoading: isResetting,
        testId: 'dashboardViewOnlyMode',
        run: () => resetChanges(true),
      } as AppMenuItemType,

      backgroundSearch: {
        order: 5,
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

      share: {
        order: 4,
        label: topNavStrings.share.label,
        tooltipContent: getShareTooltip(),
        tooltipTitle: topNavStrings.share.tooltipTitle,
        id: 'share',
        iconType: 'share',
        testId: 'shareTopNavButton',
        disableButton: disableTopNav,
        run: () => showShare(),
      } as AppMenuItemType,

      export: {
        order: 3,
        label: topNavStrings.export.label,
        id: 'export',
        iconType: 'exportAction',
        testId: 'exportTopNavButton',
        disableButton: disableTopNav,
        items: exportItems,
        popoverWidth: 160,
      } as AppMenuItemType,

      settings: {
        order: 4,
        iconType: 'gear',
        label: topNavStrings.settings.label,
        id: 'settings',
        testId: 'dashboardSettingsButton',
        disableButton: disableTopNav,
        htmlId: 'dashboardSettingsButton',
        run: () => openSettingsFlyout(dashboardApi),
      } as AppMenuItemType,

      add: {
        label: topNavStrings.add.label,
        id: 'add',
        iconType: 'plusInCircle',
        color: 'success',
        testId: 'dashboardAddTopNavButton',
        htmlId: 'dashboardAddTopNavButton',
        disableButton: disableTopNav,
        minWidth: false,
        popoverWidth: 200,
        items: addMenuItems,
      } as AppMenuSecondaryActionItem,
    };
  }, [
    disableTopNav,
    isSaveInProgress,
    lastSavedId,
    dashboardInteractiveSave,
    showShare,
    dashboardApi,
    setIsLabsShown,
    isLabsShown,
    quickSaveDashboard,
    resetChanges,
    isResetting,
    isEditButtonDisabled,
    getEditTooltip,
    getShareTooltip,
    appId,
    isQuickSaveButtonDisabled,
    hasUnsavedChanges,
    addMenuItems,
    resetChangesMenuItem,
    exportItems,
  ]);

  /**
   * Build ordered menus for view and edit mode.
   */
  const isLabsEnabled = useMemo(() => coreServices.uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI), []);

  const hasExportIntegration = useMemo(() => {
    if (!shareService) return false;
    return shareService.availableIntegrations('dashboard', 'export').length > 0;
  }, []);

  // Check time slider control compatibility
  useEffect(() => {
    isTimeSliderControlCreationCompatible(dashboardApi).then(setCanCreateTimeSlider);
  }, [dashboardApi]);

  const viewModeTopNavConfig = useMemo(() => {
    const { showWriteControls, storeSearchSession } = getDashboardCapabilities();

    const items: AppMenuItemType[] = [menuItems.fullScreen, menuItems.interactiveSave];

    // Only show the export button if the current user meets the requirements for at least one registered export integration
    if (shareService && hasExportIntegration) {
      items.push(menuItems.export);
    }

    if (shareService) {
      items.push(menuItems.share);
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
      viewModeConfig.secondaryActionItem = menuItems.edit;
    }

    return viewModeConfig;
  }, [
    menuItems.fullScreen,
    menuItems.interactiveSave,
    menuItems.export,
    menuItems.share,
    menuItems.edit,
    menuItems.backgroundSearch,
    resetChangesMenuItem,
    hasExportIntegration,
    dashboardApi.isManaged,
    showResetChange,
  ]);

  const editModeTopNavConfig = useMemo(() => {
    const { storeSearchSession } = getDashboardCapabilities();

    const items: AppMenuItemType[] = [menuItems.switchToViewMode];

    // Only show the export button if the current user meets the requirements for at least one registered export integration
    if (shareService && hasExportIntegration) {
      items.push(menuItems.export);
    }

    if (shareService) {
      items.push(menuItems.share);
    }

    items.push(menuItems.settings);

    if (storeSearchSession && dataService.search.isBackgroundSearchEnabled) {
      items.push(menuItems.backgroundSearch);
    }

    const editModeConfig: AppMenuConfig = {
      items,
      secondaryActionItem: menuItems.add,
      primaryActionItem: menuItems.quickSave,
    };

    return editModeConfig;
  }, [
    menuItems.switchToViewMode,
    menuItems.export,
    menuItems.share,
    menuItems.settings,
    menuItems.backgroundSearch,
    menuItems.add,
    menuItems.quickSave,
    hasExportIntegration,
  ]);

  const labsConfig = useMemo(() => {
    if (!isLabsEnabled) return null;
    return {
      items: [menuItems.labs],
    };
  }, [isLabsEnabled, menuItems.labs]);

  return { viewModeTopNavConfig, editModeTopNavConfig, labsConfig };
};
