/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch, SetStateAction } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';

import type { TopNavMenuData } from '@kbn/navigation-plugin/public';
import useMountedState from 'react-use/lib/useMountedState';
import { EuiContextMenuPanel, EuiContextMenuItem, EuiWrappingPopover } from '@elastic/eui';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { i18n } from '@kbn/i18n';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { UI_SETTINGS } from '../../../common/constants';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { openSettingsFlyout } from '../../dashboard_renderer/settings/open_settings_flyout';
import { confirmDiscardUnsavedChanges } from '../../dashboard_listing/confirm_overlays';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import type { SaveDashboardReturn } from '../../services/dashboard_content_management_service/types';
import { coreServices, shareService } from '../../services/kibana_services';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import { topNavStrings } from '../_dashboard_app_strings';
import { ShowShareModal } from './share/show_share_modal';

const container = document.createElement('div');
let isPopoverOpen = false;

interface SaveMorePopoverProps {
  anchorElement: HTMLElement;
  onClose: () => void;
  onSaveAs: () => void;
  onReset: () => void;
  isResetDisabled: boolean;
}

const SaveMorePopover: React.FC<SaveMorePopoverProps> = ({
  anchorElement,
  onClose,
  onSaveAs,
  onReset,
  isResetDisabled,
}) => {
  const items = [
    <EuiContextMenuItem
      key="save-as"
      data-test-subj="dashboardSaveAsFromMore"
      onClick={() => {
        onSaveAs();
        onClose();
      }}
    >
      {i18n.translate('dashboard.topNav.saveAsFromMoreLabel', {
        defaultMessage: 'Save as',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="reset"
      data-test-subj="dashboardResetFromMore"
      disabled={isResetDisabled}
      onClick={() => {
        onReset();
        onClose();
      }}
    >
      {i18n.translate('dashboard.topNav.resetFromMoreLabel', {
        defaultMessage: 'Reset changes',
      })}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiWrappingPopover
      button={anchorElement}
      isOpen={true}
      closePopover={onClose}
      panelPaddingSize="s"
      anchorPosition="downRight"
      attachToAnchor={true}
      hasArrow={false}
      offset={4}
      buffer={0}
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiWrappingPopover>
  );
};

interface AddPopoverProps {
  anchorElement: HTMLElement;
  onClose: () => void;
}

const AddPopover: React.FC<AddPopoverProps> = ({ anchorElement, onClose }) => {
  const items = [
    <EuiContextMenuItem
      key="visualization"
      data-test-subj="dashboardAddVisualization"
      icon="lensApp"
      onClick={() => {
        // TODO: Hook up visualization action
        onClose();
      }}
    >
      {i18n.translate('dashboard.topNav.addVisualizationLabel', {
        defaultMessage: 'Visualization',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="new-panel"
      data-test-subj="dashboardAddNewPanel"
      icon="plusInCircle"
      onClick={() => {
        // TODO: Hook up new panel action
        onClose();
      }}
    >
      {i18n.translate('dashboard.topNav.addNewPanelLabel', {
        defaultMessage: 'New panel',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="collapsible-section"
      data-test-subj="dashboardAddCollapsibleSection"
      icon="section"
      onClick={() => {
        // TODO: Hook up collapsible section action
        onClose();
      }}
    >
      {i18n.translate('dashboard.topNav.addCollapsibleSectionLabel', {
        defaultMessage: 'Collapsible section',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="controls"
      data-test-subj="dashboardAddControls"
      icon="controlsHorizontal"
      onClick={() => {
        // TODO: Hook up controls action
        onClose();
      }}
    >
      {i18n.translate('dashboard.topNav.addControlsLabel', {
        defaultMessage: 'Controls',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="from-library"
      data-test-subj="dashboardAddFromLibrary"
      icon="folderOpen"
      onClick={() => {
        // TODO: Hook up from library action
        onClose();
      }}
    >
      {i18n.translate('dashboard.topNav.addFromLibraryLabel', {
        defaultMessage: 'From library',
      })}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiWrappingPopover
      button={anchorElement}
      isOpen={true}
      closePopover={onClose}
      panelPaddingSize="s"
      anchorPosition="downRight"
      attachToAnchor={true}
      hasArrow={false}
      offset={4}
      buffer={0}
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiWrappingPopover>
  );
};

function cleanupPopover() {
  ReactDOM.unmountComponentAtNode(container);
  if (container.parentNode) {
    document.body.removeChild(container);
  }
  isPopoverOpen = false;
}

function showSaveMorePopover({
  anchorElement,
  onSaveAs,
  onReset,
  isResetDisabled,
}: {
  anchorElement: HTMLElement;
  onSaveAs: () => void;
  onReset: () => void;
  isResetDisabled: boolean;
}) {
  if (isPopoverOpen) {
    cleanupPopover();
    return;
  }

  isPopoverOpen = true;
  document.body.appendChild(container);

  const element = (
    <KibanaRenderContextProvider {...coreServices}>
      <SaveMorePopover
        anchorElement={anchorElement}
        onClose={() => {
          cleanupPopover();
          anchorElement?.focus();
        }}
        onSaveAs={onSaveAs}
        onReset={onReset}
        isResetDisabled={isResetDisabled}
      />
    </KibanaRenderContextProvider>
  );
  ReactDOM.render(element, container);
}

function showAddPopover({ anchorElement }: { anchorElement: HTMLElement }) {
  if (isPopoverOpen) {
    cleanupPopover();
    return;
  }

  isPopoverOpen = true;
  document.body.appendChild(container);

  const element = (
    <KibanaRenderContextProvider {...coreServices}>
      <AddPopover
        anchorElement={anchorElement}
        onClose={() => {
          cleanupPopover();
          anchorElement?.focus();
        }}
      />
    </KibanaRenderContextProvider>
  );
  ReactDOM.render(element, container);
}

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

  const [isSaveInProgress, setIsSaveInProgress] = useState(false);

  const dashboardApi = useDashboardApi();

  const [dashboardTitle, hasOverlays, hasUnsavedChanges, lastSavedId, viewMode] =
    useBatchedPublishingSubjects(
      dashboardApi.title$,
      dashboardApi.hasOverlays$,
      dashboardApi.hasUnsavedChanges$,
      dashboardApi.savedObjectId$,
      dashboardApi.viewMode$
    );
  const disableTopNav = isSaveInProgress || hasOverlays;

  /**
   * Show the Dashboard app's share menu
   */
  const showShare = useCallback(
    (anchorElement: HTMLElement, asExport?: boolean) => {
      ShowShareModal({
        asExport,
        dashboardTitle,
        anchorElement,
        savedObjectId: lastSavedId,
        isDirty: Boolean(hasUnsavedChanges),
      });
    },
    [dashboardTitle, hasUnsavedChanges, lastSavedId]
  );

  /**
   * Save the dashboard without any UI or popups.
   */
  const quickSaveDashboard = useCallback(() => {
    setIsSaveInProgress(true);
    dashboardApi.runQuickSave().then(() => setTimeout(() => setIsSaveInProgress(false), 100));
  }, [dashboardApi]);

  /**
   * initiate interactive dashboard copy action
   */
  const dashboardInteractiveSave = useCallback(() => {
    dashboardApi.runInteractiveSave().then((result) => maybeRedirect(result));
  }, [maybeRedirect, dashboardApi]);

  /**
   * Show the dashboard's "Confirm reset changes" modal. If confirmed:
   * (1) reset the dashboard to the last saved state, and
   * (2) if `switchToViewMode` is `true`, set the dashboard to view mode.
   */
  const [isResetting, setIsResetting] = useState(false);
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
   * Register all of the top nav configs that can be used by dashboard.
   */

  const menuItems = useMemo(() => {
    return {
      fullScreen: {
        ...topNavStrings.fullScreen,
        id: 'full-screen',
        testId: 'dashboardFullScreenMode',
        run: () => dashboardApi.setFullScreenMode(true),
        disableButton: disableTopNav,
      } as TopNavMenuData,

      labs: {
        ...topNavStrings.labs,
        id: 'labs',
        testId: 'dashboardLabs',
        run: () => setIsLabsShown(!isLabsShown),
      } as TopNavMenuData,

      edit: {
        ...topNavStrings.edit,
        emphasize: true,
        id: 'edit',
        iconType: 'pencil',
        testId: 'dashboardEditMode',
        className: 'eui-hideFor--s eui-hideFor--xs', // hide for small screens - editing doesn't work in mobile mode.
        run: () => {
          getDashboardBackupService().storeViewMode('edit');
          dashboardApi.setViewMode('edit');
          dashboardApi.clearOverlays();
        },
        disableButton: disableTopNav,
      } as TopNavMenuData,

      add: {
        id: 'add',
        label: i18n.translate('dashboard.topNav.addButtonLabel', {
          defaultMessage: 'Add',
        }),
        iconType: 'plusInCircle',
        emphasize: true,
        fill: false,
        color: 'primary',
        testId: 'dashboardAddButton',
        run: (anchorElement: HTMLElement) => {
          showAddPopover({ anchorElement });
        },
      } as TopNavMenuData,

      quickSave: {
        ...topNavStrings.quickSave,
        id: 'quick-save',
        // iconType: 'save',
        iconType: hasUnsavedChanges ? 'dot' : undefined,
        iconSide: hasUnsavedChanges ? 'right' : undefined,
        emphasize: true,
        fill: false,
        color: 'text',
        isLoading: isSaveInProgress,
        testId: 'dashboardQuickSaveMenuItem',
        className: `dashSplitSaveLeft${hasUnsavedChanges ? ' dashSplitSaveLeft--hasChanges' : ''}`,
        run: () => quickSaveDashboard(),
      } as TopNavMenuData,

      saveMore: {
        id: 'save-more',
        label: i18n.translate('dashboard.topNav.saveMoreLabel', {
          defaultMessage: 'More save actions',
        }),
        testId: 'dashboardSaveMoreButton',
        className: `dashSplitSaveRight${
          hasUnsavedChanges ? ' dashSplitSaveRight--hasChanges' : ''
        }`,
        emphasize: true,
        fill: false,
        color: 'text',
        iconOnly: true,
        iconType: 'arrowDown',
        iconDisplay: 'base',
        run: (anchorElement: HTMLElement) => {
          showSaveMorePopover({
            anchorElement,
            onSaveAs: dashboardInteractiveSave,
            onReset: () => resetChanges(),
            isResetDisabled:
              isResetting ||
              !hasUnsavedChanges ||
              hasOverlays ||
              (viewMode === 'edit' && (isSaveInProgress || !lastSavedId)),
          });
        },
      } as TopNavMenuData,

      interactiveSave: {
        disableButton: disableTopNav,
        emphasize: false,
        fill: false,
        color: 'text',
        id: 'interactive-save',
        testId: 'dashboardInteractiveSaveMenuItem',
        run: dashboardInteractiveSave,
        label:
          viewMode === 'view'
            ? topNavStrings.viewModeInteractiveSave.label
            : Boolean(lastSavedId)
            ? topNavStrings.editModeInteractiveSave.label
            : topNavStrings.quickSave.label,
        description:
          viewMode === 'view'
            ? topNavStrings.viewModeInteractiveSave.description
            : topNavStrings.editModeInteractiveSave.description,
      } as TopNavMenuData,

      switchToViewMode: {
        ...topNavStrings.switchToViewMode,
        id: 'cancel',
        disableButton: disableTopNav || !lastSavedId || isResetting,
        isLoading: isResetting,
        testId: 'dashboardViewOnlyMode',
        run: () => resetChanges(true),
      } as TopNavMenuData,

      share: {
        ...topNavStrings.share,
        id: 'share',
        // iconType: 'share',
        iconOnly: false,
        testId: 'shareTopNavButton',
        disableButton: disableTopNav,
        run: showShare,
      } as TopNavMenuData,

      export: {
        ...topNavStrings.export,
        id: 'export',
        // iconType: 'download',
        iconOnly: false,
        testId: 'exportTopNavButton',
        disableButton: disableTopNav,
        run: (anchorElement) => showShare(anchorElement, true),
      } as TopNavMenuData,

      settings: {
        ...topNavStrings.settings,
        id: 'settings',
        testId: 'dashboardSettingsButton',
        disableButton: disableTopNav,
        htmlId: 'dashboardSettingsButton',
        run: () => openSettingsFlyout(dashboardApi),
      },
    };
  }, [
    disableTopNav,
    isSaveInProgress,
    hasUnsavedChanges,
    lastSavedId,
    dashboardInteractiveSave,
    viewMode,
    showShare,
    dashboardApi,
    setIsLabsShown,
    isLabsShown,
    quickSaveDashboard,
    resetChanges,
    isResetting,
    hasOverlays,
  ]);

  const resetChangesMenuItem = useMemo(() => {
    return {
      ...topNavStrings.resetChanges,
      id: 'reset',
      testId: 'dashboardDiscardChangesMenuItem',
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
   * Build ordered menus for view and edit mode.
   */
  const isLabsEnabled = useMemo(() => coreServices.uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI), []);

  const hasExportIntegration = useMemo(() => {
    if (!shareService) return false;
    return shareService.availableIntegrations('dashboard', 'export').length > 0;
  }, []);

  const viewModeTopNavConfig = useMemo(() => {
    const { showWriteControls } = getDashboardCapabilities();

    const labsMenuItem = isLabsEnabled ? [menuItems.labs] : [];
    const shareMenuItem = shareService
      ? ([
          // Only show the export button if the current user meets the requirements for at least one registered export integration
          hasExportIntegration ? menuItems.export : null,
          menuItems.share,
        ].filter(Boolean) as TopNavMenuData[])
      : [];
    const duplicateMenuItem = showWriteControls ? [menuItems.interactiveSave] : [];
    const editMenuItem = showWriteControls && !dashboardApi.isManaged ? [menuItems.edit] : [];
    const mayberesetChangesMenuItem = showResetChange ? [resetChangesMenuItem] : [];

    return [
      ...labsMenuItem,
      menuItems.fullScreen,
      ...duplicateMenuItem,
      ...shareMenuItem,
      ...editMenuItem,
      ...mayberesetChangesMenuItem,
    ];
  }, [
    isLabsEnabled,
    menuItems.labs,
    menuItems.export,
    menuItems.share,
    menuItems.interactiveSave,
    menuItems.edit,
    menuItems.fullScreen,
    hasExportIntegration,
    dashboardApi.isManaged,
    showResetChange,
    resetChangesMenuItem,
  ]);

  const editModeTopNavConfig = useMemo(() => {
    const labsMenuItem = isLabsEnabled ? [menuItems.labs] : [];
    const shareMenuItem = shareService
      ? ([
          // Only show the export button if the current user meets the requirements for at least one registered export integration
          hasExportIntegration ? menuItems.export : null,
          menuItems.share,
        ].filter(Boolean) as TopNavMenuData[])
      : [];

    // Build the menu order: Labs > Settings > Exit Edit > Share items > Add > Save buttons
    const editModeTopNavConfigItems = [
      ...labsMenuItem,
      menuItems.settings,
      // Add 'Exit edit' (Switch to view mode) right after Settings if there's a saved ID
      ...(lastSavedId ? [menuItems.switchToViewMode] : []),
      ...shareMenuItem,
      // Green 'Add' button before Save
      menuItems.add,
      // Always include Save and Save More in Edit mode (split button)
      // Save as and Reset are now included in the Save More popover menu
      menuItems.quickSave,
      menuItems.saveMore,
    ];

    return editModeTopNavConfigItems;
  }, [
    isLabsEnabled,
    menuItems.labs,
    menuItems.export,
    menuItems.share,
    menuItems.settings,
    menuItems.switchToViewMode,
    menuItems.add,
    menuItems.quickSave,
    menuItems.saveMore,
    hasExportIntegration,
    lastSavedId,
  ]);

  return { viewModeTopNavConfig, editModeTopNavConfig };
};
