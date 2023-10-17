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
import { TopNavMenuProps } from '@kbn/navigation-plugin/public';
import { EuiHorizontalRule, EuiIcon, EuiToolTipProps } from '@elastic/eui';
import { EuiBreadcrumbProps } from '@elastic/eui/src/components/breadcrumbs/breadcrumb';
import { MountPoint } from '@kbn/core/public';
import {
  getDashboardTitle,
  leaveConfirmStrings,
  getDashboardBreadcrumb,
  unsavedChangesBadgeStrings,
  dashboardManagedBadge,
} from '../dashboard_app/_dashboard_app_strings';
import { UI_SETTINGS } from '../../common';
import { useDashboardAPI } from '../dashboard_app/dashboard_app';
import { pluginServices } from '../services/plugin_services';
import { useDashboardMenuItems } from '../dashboard_app/top_nav/use_dashboard_menu_items';
import { DashboardEmbedSettings } from '../dashboard_app/types';
import { DashboardEditingToolbar } from '../dashboard_app/top_nav/dashboard_editing_toolbar';
import { useDashboardMountContext } from '../dashboard_app/hooks/dashboard_mount_context';
import { getFullEditPath, LEGACY_DASHBOARD_APP_ID } from '../dashboard_constants';
import './_dashboard_top_nav.scss';
import { DashboardRedirect } from '../dashboard_container/types';

export interface InternalDashboardTopNavProps {
  customLeadingBreadCrumbs?: EuiBreadcrumbProps[];
  embedSettings?: DashboardEmbedSettings;
  forceHideUnifiedSearch?: boolean;
  redirectTo: DashboardRedirect;
  setCustomHeaderActionMenu?: (menuMount: MountPoint<HTMLElement> | undefined) => void;
  showBorderBottom?: boolean;
  showResetChange?: boolean;
}

const LabsFlyout = withSuspense(LazyLabsFlyout, null);

export function InternalDashboardTopNav({
  customLeadingBreadCrumbs = [],
  embedSettings,
  forceHideUnifiedSearch,
  redirectTo,
  setCustomHeaderActionMenu,
  showBorderBottom = true,
  showResetChange = true,
}: InternalDashboardTopNavProps) {
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
    serverless,
    settings: { uiSettings },
    navigation: { TopNavMenu },
    embeddable: { getStateTransfer },
    initializerContext: { allowByValueEmbeddables },
    dashboardCapabilities: { saveQuery: allowSaveQuery, showWriteControls },
  } = pluginServices.getServices();
  const isLabsEnabled = uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI);
  const { setHeaderActionMenu, onAppLeave } = useDashboardMountContext();

  const dashboard = useDashboardAPI();
  const PresentationUtilContextProvider = getPresentationUtilContextProvider();

  const hasRunMigrations = dashboard.select(
    (state) => state.componentState.hasRunClientsideMigrations
  );
  const hasUnsavedChanges = dashboard.select((state) => state.componentState.hasUnsavedChanges);
  const fullScreenMode = dashboard.select((state) => state.componentState.fullScreenMode);
  const savedQueryId = dashboard.select((state) => state.componentState.savedQueryId);
  const lastSavedId = dashboard.select((state) => state.componentState.lastSavedId);
  const focusedPanelId = dashboard.select((state) => state.componentState.focusedPanelId);
  const managed = dashboard.select((state) => state.componentState.managed);

  const viewMode = dashboard.select((state) => state.explicitInput.viewMode);
  const query = dashboard.select((state) => state.explicitInput.query);
  const title = dashboard.select((state) => state.explicitInput.title);

  // store data views in state & subscribe to dashboard data view changes.
  const [allDataViews, setAllDataViews] = useState<DataView[]>([]);
  useEffect(() => {
    setAllDataViews(dashboard.getAllDataViews());
    const subscription = dashboard.onDataViewsUpdate$.subscribe((dataViews) =>
      setAllDataViews(dataViews)
    );
    return () => subscription.unsubscribe();
  }, [dashboard]);

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
    const dashboardTitleBreadcrumbs = [
      {
        text:
          viewMode === ViewMode.EDIT ? (
            <>
              {dashboardTitle} <EuiIcon size="s" type="pencil" />
            </>
          ) : (
            dashboardTitle
          ),
        onClick:
          viewMode === ViewMode.EDIT
            ? () => {
                dashboard.showSettings();
              }
            : undefined,
      },
    ];

    if (serverless?.setBreadcrumbs) {
      // set serverless breadcrumbs if available,
      // set only the dashboardTitleBreadcrumbs because the main breadcrumbs automatically come as part of the navigation config
      serverless.setBreadcrumbs(dashboardTitleBreadcrumbs);
    } else {
      /**
       * non-serverless regular breadcrumbs
       * Dashboard embedded in other plugins (e.g. SecuritySolution)
       * will have custom leading breadcrumbs for back to their app.
       **/
      setBreadcrumbs(
        customLeadingBreadCrumbs.concat([
          {
            text: getDashboardBreadcrumb(),
            'data-test-subj': 'dashboardListingBreadcrumb',
            onClick: () => {
              redirectTo({ destination: 'listing' });
            },
          },
          ...dashboardTitleBreadcrumbs,
        ])
      );
    }
  }, [
    setBreadcrumbs,
    redirectTo,
    dashboardTitle,
    dashboard,
    viewMode,
    serverless,
    customLeadingBreadCrumbs,
  ]);

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

  const visibilityProps = useMemo(() => {
    const shouldShowNavBarComponent = (forceShow: boolean): boolean =>
      (forceShow || isChromeVisible) && !fullScreenMode;
    const shouldShowFilterBar = (forceHide: boolean): boolean =>
      !forceHide && (filterManager.getFilters().length > 0 || !fullScreenMode);

    const showTopNavMenu = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowTopNavMenu));
    const showQueryInput = Boolean(forceHideUnifiedSearch)
      ? false
      : shouldShowNavBarComponent(
          Boolean(embedSettings?.forceShowQueryInput || viewMode === ViewMode.PRINT)
        );
    const showDatePicker = Boolean(forceHideUnifiedSearch)
      ? false
      : shouldShowNavBarComponent(Boolean(embedSettings?.forceShowDatePicker));
    const showFilterBar = shouldShowFilterBar(Boolean(embedSettings?.forceHideFilterBar));
    const showQueryBar = showQueryInput || showDatePicker || showFilterBar;
    const showSearchBar = showQueryBar || showFilterBar;
    return {
      showTopNavMenu,
      showSearchBar,
      showFilterBar,
      showQueryInput,
      showDatePicker,
    };
  }, [
    embedSettings,
    filterManager,
    forceHideUnifiedSearch,
    fullScreenMode,
    isChromeVisible,
    viewMode,
  ]);

  const { viewModeTopNavConfig, editModeTopNavConfig } = useDashboardMenuItems({
    redirectTo,
    isLabsShown,
    setIsLabsShown,
    showResetChange,
  });

  UseUnmount(() => {
    dashboard.clearOverlays();
  });

  const badges = useMemo(() => {
    const allBadges: TopNavMenuProps['badges'] = [];
    if (hasUnsavedChanges && viewMode === ViewMode.EDIT) {
      allBadges.push({
        'data-test-subj': 'dashboardUnsavedChangesBadge',
        badgeText: unsavedChangesBadgeStrings.getUnsavedChangedBadgeText(),
        title: '',
        color: 'warning',
        toolTipProps: {
          content: unsavedChangesBadgeStrings.getUnsavedChangedBadgeToolTipContent(),
          position: 'bottom',
        } as EuiToolTipProps,
      });
    }
    if (hasRunMigrations && viewMode === ViewMode.EDIT) {
      allBadges.push({
        'data-test-subj': 'dashboardSaveRecommendedBadge',
        badgeText: unsavedChangesBadgeStrings.getHasRunMigrationsText(),
        title: '',
        color: 'success',
        iconType: 'save',
        toolTipProps: {
          content: unsavedChangesBadgeStrings.getHasRunMigrationsToolTipContent(),
          position: 'bottom',
        } as EuiToolTipProps,
      });
    }
    if (showWriteControls && managed) {
      allBadges.push({
        'data-test-subj': 'dashboardSaveRecommendedBadge',
        badgeText: dashboardManagedBadge.getText(),
        title: '',
        color: 'primary',
        iconType: 'glasses',
        toolTipProps: {
          content: dashboardManagedBadge.getTooltip(),
          position: 'bottom',
        } as EuiToolTipProps,
      });
    }
    return allBadges;
  }, [hasUnsavedChanges, viewMode, hasRunMigrations, showWriteControls, managed]);

  return (
    <div className="dashboardTopNav">
      <h1
        id="dashboardTitle"
        className="euiScreenReaderOnly"
        ref={dashboardTitleRef}
        tabIndex={-1}
      >{`${getDashboardBreadcrumb()} - ${dashboardTitle}`}</h1>
      <TopNavMenu
        {...visibilityProps}
        query={query}
        badges={badges}
        screenTitle={title}
        useDefaultBehaviors={true}
        savedQueryId={savedQueryId}
        indexPatterns={allDataViews}
        saveQueryMenuVisibility={allowSaveQuery ? 'allowed_by_app_privilege' : 'globally_managed'}
        appName={LEGACY_DASHBOARD_APP_ID}
        visible={viewMode !== ViewMode.PRINT}
        setMenuMountPoint={
          embedSettings || fullScreenMode
            ? setCustomHeaderActionMenu ?? undefined
            : setHeaderActionMenu
        }
        className={fullScreenMode ? 'kbnTopNavMenu-isFullScreen' : undefined}
        config={
          visibilityProps.showTopNavMenu
            ? viewMode === ViewMode.EDIT
              ? editModeTopNavConfig
              : viewModeTopNavConfig
            : undefined
        }
        onQuerySubmit={(_payload, isUpdate) => {
          if (isUpdate === false) {
            dashboard.forceRefresh();
          }
        }}
        onSavedQueryIdChange={(newId: string | undefined) =>
          dashboard.dispatch.setSavedQueryId(newId)
        }
      />
      {viewMode !== ViewMode.PRINT && isLabsEnabled && isLabsShown ? (
        <PresentationUtilContextProvider>
          <LabsFlyout solutions={['dashboard']} onClose={() => setIsLabsShown(false)} />
        </PresentationUtilContextProvider>
      ) : null}
      {viewMode === ViewMode.EDIT ? (
        <DashboardEditingToolbar isDisabled={!!focusedPanelId} />
      ) : null}
      {showBorderBottom && <EuiHorizontalRule margin="none" />}
    </div>
  );
}
