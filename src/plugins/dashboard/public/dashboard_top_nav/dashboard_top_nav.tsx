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
import { SerializedStyles } from '@emotion/react';
import classNames from 'classnames';
import { EuiHorizontalRule, EuiIcon, EuiToolTipProps } from '@elastic/eui';
import {
  getDashboardTitle,
  leaveConfirmStrings,
  getDashboardBreadcrumb,
  unsavedChangesBadgeStrings,
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
  embedSettings?: DashboardEmbedSettings;
  redirectTo: DashboardRedirect;
  originatingApp?: string;
  originatingPath?: string;
}

const LabsFlyout = withSuspense(LazyLabsFlyout, null);

export function InternalDashboardTopNav({
  embedSettings,
  redirectTo,
  originatingApp,
  originatingPath,
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
    settings: { uiSettings },
    navigation: { TopNavMenu },
    embeddable: { getStateTransfer },
    initializerContext: { allowByValueEmbeddables },
    dashboardCapabilities: { saveQuery: showSaveQuery },
  } = pluginServices.getServices();
  const isLabsEnabled = uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI);
  const { setHeaderActionMenu, onAppLeave } = useDashboardMountContext();

  const dashboard = useDashboardAPI();
  const PresentationUtilContextProvider = getPresentationUtilContextProvider();

  const hasUnsavedChanges = dashboard.select((state) => state.componentState.hasUnsavedChanges);
  const fullScreenMode = dashboard.select((state) => state.componentState.fullScreenMode);
  const savedQueryId = dashboard.select((state) => state.componentState.savedQueryId);
  const lastSavedId = dashboard.select((state) => state.componentState.lastSavedId);

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
    setBreadcrumbs([
      {
        text: getDashboardBreadcrumb(),
        'data-test-subj': 'dashboardListingBreadcrumb',
        onClick: () => {
          redirectTo({ destination: 'listing' });
        },
      },
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
    ]);
  }, [setBreadcrumbs, redirectTo, dashboardTitle, dashboard, viewMode]);

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
      forceShow && isChromeVisible && !fullScreenMode;
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

    return {
      showTopNavMenu,
      showSearchBar,
      showFilterBar,
      showQueryInput,
      showDatePicker,
      showBorderBottom: embedSettings?.showBorderBottom ?? true,
      showBackgroundColor: embedSettings?.showBackgroundColor ?? true,
      showFullScreenButton: embedSettings?.showFullScreenButton ?? true,
      editingToolBarCss: embedSettings?.editingToolBarCss ?? ({} as SerializedStyles),
      topNavMenuAlignRight: embedSettings?.topNavMenuAlignRight ?? false,
      showStickyTopNav: embedSettings?.showStickyTopNav ?? true,
    };
  }, [embedSettings, filterManager, fullScreenMode, isChromeVisible, viewMode]);

  const { viewModeTopNavConfig, editModeTopNavConfig } = useDashboardMenuItems({
    redirectTo,
    isLabsShown,
    setIsLabsShown,
    showFullScreenButton: visibilityProps.showFullScreenButton,
  });

  UseUnmount(() => {
    dashboard.clearOverlays();
  });

  return (
    <div
      className={classNames('dashboardTopNav', {
        'dashboardTopNav-noBackgroundColor': !visibilityProps.showBackgroundColor,
        'dashboardTopNav-right': visibilityProps.topNavMenuAlignRight,
        'dashboardTopNav-noSticky': !visibilityProps.showStickyTopNav,
      })}
    >
      <h1
        id="dashboardTitle"
        className="euiScreenReaderOnly"
        ref={dashboardTitleRef}
        tabIndex={-1}
      >{`${getDashboardBreadcrumb()} - ${dashboardTitle}`}</h1>
      <TopNavMenu
        {...visibilityProps}
        query={query}
        screenTitle={title}
        useDefaultBehaviors={true}
        indexPatterns={allDataViews}
        savedQueryId={savedQueryId}
        showSaveQuery={showSaveQuery}
        appName={LEGACY_DASHBOARD_APP_ID}
        visible={viewMode !== ViewMode.PRINT}
        alignRight={visibilityProps.topNavMenuAlignRight}
        setMenuMountPoint={embedSettings || fullScreenMode ? undefined : setHeaderActionMenu}
        className={classNames({
          'kbnTopNavMenu-isFullScreen': fullScreenMode,
        })}
        config={
          visibilityProps.showTopNavMenu
            ? viewMode === ViewMode.EDIT
              ? editModeTopNavConfig
              : viewModeTopNavConfig
            : undefined
        }
        badges={
          hasUnsavedChanges && viewMode === ViewMode.EDIT
            ? [
                {
                  'data-test-subj': 'dashboardUnsavedChangesBadge',
                  badgeText: unsavedChangesBadgeStrings.getUnsavedChangedBadgeText(),
                  title: '',
                  color: 'warning',
                  toolTipProps: {
                    content: unsavedChangesBadgeStrings.getUnsavedChangedBadgeToolTipContent(),
                    position: 'bottom',
                  } as EuiToolTipProps,
                },
              ]
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
        <DashboardEditingToolbar
          wrapperCss={visibilityProps.editingToolBarCss}
          originatingApp={originatingApp}
          originatingPath={originatingPath}
        />
      ) : null}
      {visibilityProps.showBorderBottom && <EuiHorizontalRule margin="none" />}
    </div>
  );
}
