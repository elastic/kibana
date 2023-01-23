/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import UseUnmount from 'react-use/lib/useUnmount';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  withSuspense,
  LazyLabsFlyout,
  getContextProvider as getPresentationUtilContextProvider,
} from '@kbn/presentation-util-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TopNavMenuProps } from '@kbn/navigation-plugin/public';

import {
  getDashboardTitle,
  leaveConfirmStrings,
  getDashboardBreadcrumb,
  unsavedChangesBadgeStrings,
} from '../_dashboard_app_strings';
import { UI_SETTINGS } from '../../../common';
import { pluginServices } from '../../services/plugin_services';
import { useDashboardMenuItems } from './use_dashboard_menu_items';
import { DashboardEmbedSettings, DashboardRedirect } from '../types';
import { DashboardEditingToolbar } from './dashboard_editing_toolbar';
import { useDashboardMountContext } from '../hooks/dashboard_mount_context';
import { getFullEditPath, LEGACY_DASHBOARD_APP_ID } from '../../dashboard_constants';
import { useDashboardContainerContext } from '../../dashboard_container/dashboard_container_renderer';

export interface DashboardTopNavProps {
  embedSettings?: DashboardEmbedSettings;
  redirectTo: DashboardRedirect;
}

const LabsFlyout = withSuspense(LazyLabsFlyout, null);

export function DashboardTopNav({ embedSettings, redirectTo }: DashboardTopNavProps) {
  const [isChromeVisible, setIsChromeVisible] = useState(false);
  const [isLabsShown, setIsLabsShown] = useState(false);

  const dashboardTitleRef = useRef<HTMLHeadingElement>(null);

  /**
   * Unpack dashboard services
   */
  const {
    data: {
      query: { filterManager },
    },
    chrome: {
      setBreadcrumbs,
      setIsVisible: setChromeVisibility,
      getIsVisible$: getChromeIsVisible$,
      recentlyAccessed: chromeRecentlyAccessed,
    },
    settings: { uiSettings },
    navigation: { TopNavMenu },
    embeddable: { getStateTransfer },
    initializerContext: { allowByValueEmbeddables },
    dashboardCapabilities: { saveQuery: showSaveQuery },
  } = pluginServices.getServices();
  const isLabsEnabled = uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI);
  const { setHeaderActionMenu, onAppLeave } = useDashboardMountContext();

  /**
   * Unpack dashboard state from redux
   */
  const {
    useEmbeddableDispatch,
    actions: { setSavedQueryId },
    useEmbeddableSelector: select,
    embeddableInstance: dashboardContainer,
  } = useDashboardContainerContext();
  const dispatch = useEmbeddableDispatch();
  const PresentationUtilContextProvider = getPresentationUtilContextProvider();

  const hasUnsavedChanges = select((state) => state.componentState.hasUnsavedChanges);
  const fullScreenMode = select((state) => state.componentState.fullScreenMode);
  const savedQueryId = select((state) => state.componentState.savedQueryId);
  const lastSavedId = select((state) => state.componentState.lastSavedId);
  const viewMode = select((state) => state.explicitInput.viewMode);
  const query = select((state) => state.explicitInput.query);
  const title = select((state) => state.explicitInput.title);

  // store data views in state & subscribe to dashboard data view changes.
  const [allDataViews, setAllDataViews] = useState<DataView[]>(
    dashboardContainer.getAllDataViews()
  );
  useEffect(() => {
    const subscription = dashboardContainer.onDataViewsUpdate$.subscribe((dataViews) =>
      setAllDataViews(dataViews)
    );
    return () => subscription.unsubscribe();
  }, [dashboardContainer]);

  const dashboardTitle = useMemo(() => {
    return getDashboardTitle(title, viewMode, !lastSavedId);
  }, [title, viewMode, lastSavedId]);

  /**
   * focus on the top header when title or view mode is changed
   */
  useEffect(() => {
    dashboardTitleRef.current?.focus();
  }, [title, viewMode]);

  /**
   * Manage chrome visibility when dashboard is embedded.
   */
  useEffect(() => {
    if (!embedSettings) setChromeVisibility(viewMode !== ViewMode.PRINT);
  }, [embedSettings, setChromeVisibility, viewMode]);

  /**
   * populate recently accessed, and set is chrome visible.
   */
  useEffect(() => {
    const subscription = getChromeIsVisible$().subscribe((visible) => setIsChromeVisible(visible));
    if (lastSavedId && title) {
      chromeRecentlyAccessed.add(
        getFullEditPath(lastSavedId, viewMode === ViewMode.EDIT),
        title,
        lastSavedId
      );
    }
    return () => subscription.unsubscribe();
  }, [
    allowByValueEmbeddables,
    chromeRecentlyAccessed,
    getChromeIsVisible$,
    lastSavedId,
    viewMode,
    title,
  ]);

  /**
   * Set breadcrumbs to dashboard title when dashboard's title or view mode changes
   */
  useEffect(() => {
    setBreadcrumbs([
      {
        text: getDashboardBreadcrumb(),
        'data-test-subj': 'dashboardListingBreadcrumb',
        onClick: () => {
          redirectTo({ destination: 'listing' });
        },
      },
      {
        text: dashboardTitle,
      },
    ]);
  }, [setBreadcrumbs, redirectTo, dashboardTitle]);

  /**
   * Build app leave handler whenever hasUnsavedChanges changes
   */
  useEffect(() => {
    onAppLeave((actions) => {
      if (
        viewMode === ViewMode.EDIT &&
        hasUnsavedChanges &&
        !getStateTransfer().isTransferInProgress
      ) {
        return actions.confirm(
          leaveConfirmStrings.getLeaveSubtitle(),
          leaveConfirmStrings.getLeaveTitle()
        );
      }
      return actions.default();
    });
    return () => {
      // reset on app leave handler so leaving from the listing page doesn't trigger a confirmation
      onAppLeave((actions) => actions.default());
    };
  }, [onAppLeave, getStateTransfer, hasUnsavedChanges, viewMode]);

  const { viewModeTopNavConfig, editModeTopNavConfig } = useDashboardMenuItems({
    redirectTo,
    isLabsShown,
    setIsLabsShown,
  });

  const getNavBarProps = (): TopNavMenuProps => {
    const shouldShowNavBarComponent = (forceShow: boolean): boolean =>
      (forceShow || isChromeVisible) && !fullScreenMode;

    const shouldShowFilterBar = (forceHide: boolean): boolean =>
      !forceHide && (filterManager.getFilters().length > 0 || !fullScreenMode);

    const showTopNavMenu = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowTopNavMenu));
    const showQueryInput = shouldShowNavBarComponent(
      Boolean(embedSettings?.forceShowQueryInput || viewMode === ViewMode.PRINT)
    );
    const showDatePicker = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowDatePicker));
    const showFilterBar = shouldShowFilterBar(Boolean(embedSettings?.forceHideFilterBar));
    const showQueryBar = showQueryInput || showDatePicker || showFilterBar;
    const showSearchBar = showQueryBar || showFilterBar;
    const topNavConfig = viewMode === ViewMode.EDIT ? editModeTopNavConfig : viewModeTopNavConfig;

    const badges =
      hasUnsavedChanges && viewMode === ViewMode.EDIT
        ? [
            {
              'data-test-subj': 'dashboardUnsavedChangesBadge',
              badgeText: unsavedChangesBadgeStrings.getUnsavedChangedBadgeText(),
              color: 'success',
            },
          ]
        : undefined;

    return {
      query,
      badges,
      savedQueryId,
      showSearchBar,
      showFilterBar,
      showSaveQuery,
      showQueryInput,
      showDatePicker,
      screenTitle: title,
      useDefaultBehaviors: true,
      appName: LEGACY_DASHBOARD_APP_ID,
      visible: viewMode !== ViewMode.PRINT,
      indexPatterns: allDataViews,
      config: showTopNavMenu ? topNavConfig : undefined,
      setMenuMountPoint: embedSettings ? undefined : setHeaderActionMenu,
      className: fullScreenMode ? 'kbnTopNavMenu-isFullScreen' : undefined,
      onQuerySubmit: (_payload, isUpdate) => {
        if (isUpdate === false) {
          dashboardContainer.forceRefresh();
        }
      },
      onSavedQueryIdChange: (newId: string | undefined) => {
        dispatch(setSavedQueryId(newId));
      },
    };
  };

  UseUnmount(() => {
    dashboardContainer.clearOverlays();
  });

  return (
    <>
      <h1
        id="dashboardTitle"
        className="euiScreenReaderOnly"
        ref={dashboardTitleRef}
        tabIndex={-1}
      >{`${getDashboardBreadcrumb()} - ${dashboardTitle}`}</h1>
      <TopNavMenu {...getNavBarProps()} />
      {viewMode !== ViewMode.PRINT && isLabsEnabled && isLabsShown ? (
        <PresentationUtilContextProvider>
          <LabsFlyout solutions={['dashboard']} onClose={() => setIsLabsShown(false)} />
        </PresentationUtilContextProvider>
      ) : null}
      {viewMode === ViewMode.EDIT ? <DashboardEditingToolbar /> : null}
    </>
  );
}
