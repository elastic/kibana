/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UseUnmount from 'react-use/lib/useUnmount';

import {
  EuiBadge,
  EuiBreadcrumb,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiToolTipProps,
} from '@elastic/eui';
import { MountPoint } from '@kbn/core/public';
import { Query } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { getManagedContentBadge } from '@kbn/managed-content-badge';
import { TopNavMenuBadgeProps, TopNavMenuProps } from '@kbn/navigation-plugin/public';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import {
  LazyLabsFlyout,
  getContextProvider as getPresentationUtilContextProvider,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';

import { UI_SETTINGS } from '../../common';
import { useDashboardApi } from '../dashboard_api/use_dashboard_api';
import {
  dashboardManagedBadge,
  getDashboardBreadcrumb,
  getDashboardTitle,
  leaveConfirmStrings,
  unsavedChangesBadgeStrings,
} from '../dashboard_app/_dashboard_app_strings';
import { useDashboardMountContext } from '../dashboard_app/hooks/dashboard_mount_context';
import { DashboardEditingToolbar } from '../dashboard_app/top_nav/dashboard_editing_toolbar';
import { useDashboardMenuItems } from '../dashboard_app/top_nav/use_dashboard_menu_items';
import { DashboardEmbedSettings } from '../dashboard_app/types';
import { LEGACY_DASHBOARD_APP_ID, getFullEditPath } from '../dashboard_constants';
import { DashboardRedirect } from '../dashboard_container/types';
import { SaveDashboardReturn } from '../services/dashboard_content_management/types';
import {
  coreServices,
  dataService,
  embeddableService,
  navigationService,
} from '../services/kibana_services';
import { pluginServices } from '../services/plugin_services';
import './_dashboard_top_nav.scss';

export interface InternalDashboardTopNavProps {
  customLeadingBreadCrumbs?: EuiBreadcrumb[];
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
    serverless,
    initializerContext: { allowByValueEmbeddables },
    dashboardCapabilities: { saveQuery: allowSaveQuery, showWriteControls },
    dashboardRecentlyAccessed,
  } = pluginServices.getServices();
  const isLabsEnabled = coreServices.uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI);
  const { setHeaderActionMenu, onAppLeave } = useDashboardMountContext();

  const dashboardApi = useDashboardApi();
  const PresentationUtilContextProvider = getPresentationUtilContextProvider();

  const [
    allDataViews,
    focusedPanelId,
    fullScreenMode,
    hasRunMigrations,
    hasUnsavedChanges,
    lastSavedId,
    managed,
    query,
    title,
    viewMode,
  ] = useBatchedPublishingSubjects(
    dashboardApi.dataViews,
    dashboardApi.focusedPanelId$,
    dashboardApi.fullScreenMode$,
    dashboardApi.hasRunMigrations$,
    dashboardApi.hasUnsavedChanges$,
    dashboardApi.savedObjectId,
    dashboardApi.managed$,
    dashboardApi.query$,
    dashboardApi.panelTitle,
    dashboardApi.viewMode
  );

  const [savedQueryId, setSavedQueryId] = useState<string | undefined>();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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
    if (!embedSettings) coreServices.chrome.setIsVisible(viewMode !== 'print');
  }, [embedSettings, viewMode]);

  /**
   * populate recently accessed, and set is chrome visible.
   */
  useEffect(() => {
    const subscription = coreServices.chrome
      .getIsVisible$()
      .subscribe((visible) => setIsChromeVisible(visible));
    if (lastSavedId && title) {
      coreServices.chrome.recentlyAccessed.add(
        getFullEditPath(lastSavedId, viewMode === 'edit'),
        title,
        lastSavedId
      );
      dashboardRecentlyAccessed.add(
        getFullEditPath(lastSavedId, viewMode === 'edit'),
        title,
        lastSavedId
      );
    }
    return () => subscription.unsubscribe();
  }, [allowByValueEmbeddables, lastSavedId, viewMode, title, dashboardRecentlyAccessed]);

  /**
   * Set breadcrumbs to dashboard title when dashboard's title or view mode changes
   */
  useEffect(() => {
    const dashboardTitleBreadcrumbs = [
      {
        text:
          viewMode === 'edit' ? (
            <>
              {dashboardTitle}
              <EuiIcon
                size="s"
                type="pencil"
                className="dshTitleBreadcrumbs__updateIcon"
                onClick={() => dashboardApi.openSettingsFlyout()}
              />
            </>
          ) : (
            dashboardTitle
          ),
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
      coreServices.chrome.setBreadcrumbs(
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
  }, [redirectTo, dashboardTitle, dashboardApi, viewMode, serverless, customLeadingBreadCrumbs]);

  /**
   * Build app leave handler whenever hasUnsavedChanges changes
   */
  useEffect(() => {
    onAppLeave((actions) => {
      if (
        viewMode === 'edit' &&
        hasUnsavedChanges &&
        !embeddableService.getStateTransfer().isTransferInProgress
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
  }, [onAppLeave, hasUnsavedChanges, viewMode]);

  const visibilityProps = useMemo(() => {
    const shouldShowNavBarComponent = (forceShow: boolean): boolean =>
      (forceShow || isChromeVisible) && !fullScreenMode;
    const shouldShowFilterBar = (forceHide: boolean): boolean =>
      !forceHide && (dataService.query.filterManager.getFilters().length > 0 || !fullScreenMode);

    const showTopNavMenu = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowTopNavMenu));
    const showQueryInput = Boolean(forceHideUnifiedSearch)
      ? false
      : shouldShowNavBarComponent(
          Boolean(embedSettings?.forceShowQueryInput || viewMode === 'edit')
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
  }, [embedSettings, forceHideUnifiedSearch, fullScreenMode, isChromeVisible, viewMode]);

  const maybeRedirect = useCallback(
    (result?: SaveDashboardReturn) => {
      if (!result) return;
      const { redirectRequired, id } = result;
      if (redirectRequired) {
        redirectTo({
          id,
          editMode: true,
          useReplace: true,
          destination: 'dashboard',
        });
      }
    },
    [redirectTo]
  );

  const { viewModeTopNavConfig, editModeTopNavConfig } = useDashboardMenuItems({
    isLabsShown,
    setIsLabsShown,
    maybeRedirect,
    showResetChange,
  });

  UseUnmount(() => {
    dashboardApi.clearOverlays();
  });

  const badges = useMemo(() => {
    const allBadges: TopNavMenuProps['badges'] = [];
    if (hasUnsavedChanges && viewMode === 'edit') {
      allBadges.push({
        'data-test-subj': 'dashboardUnsavedChangesBadge',
        badgeText: unsavedChangesBadgeStrings.getUnsavedChangedBadgeText(),
        title: '',
        color: '#F6E58D',
        toolTipProps: {
          content: unsavedChangesBadgeStrings.getUnsavedChangedBadgeToolTipContent(),
          position: 'bottom',
        } as EuiToolTipProps,
      });
    }
    if (hasRunMigrations && viewMode === 'edit') {
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
      const badgeProps = {
        ...getManagedContentBadge(dashboardManagedBadge.getBadgeAriaLabel()),
        onClick: () => setIsPopoverOpen(!isPopoverOpen),
        onClickAriaLabel: dashboardManagedBadge.getBadgeAriaLabel(),
        iconOnClick: () => setIsPopoverOpen(!isPopoverOpen),
        iconOnClickAriaLabel: dashboardManagedBadge.getBadgeAriaLabel(),
      } as TopNavMenuBadgeProps;

      allBadges.push({
        renderCustomBadge: ({ badgeText }) => {
          const badgeButton = <EuiBadge {...badgeProps}>{badgeText}</EuiBadge>;
          return (
            <EuiPopover
              button={badgeButton}
              isOpen={isPopoverOpen}
              closePopover={() => setIsPopoverOpen(false)}
              panelStyle={{ maxWidth: 250 }}
            >
              <FormattedMessage
                id="dashboard.managedContentPopoverButton"
                defaultMessage="Elastic manages this dashboard. {Duplicate} it to make changes."
                values={{
                  Duplicate: (
                    <EuiLink
                      id="dashboardManagedContentPopoverButton"
                      onClick={() => {
                        dashboardApi
                          .runInteractiveSave(viewMode)
                          .then((result) => maybeRedirect(result));
                      }}
                      aria-label={dashboardManagedBadge.getDuplicateButtonAriaLabel()}
                    >
                      <FormattedMessage
                        id="dashboard.managedContentPopoverButtonText"
                        defaultMessage="Duplicate"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </EuiPopover>
          );
        },
        badgeText: badgeProps.badgeText,
      });
    }
    return allBadges;
  }, [
    hasUnsavedChanges,
    viewMode,
    hasRunMigrations,
    showWriteControls,
    managed,
    isPopoverOpen,
    dashboardApi,
    maybeRedirect,
  ]);

  return (
    <div className="dashboardTopNav">
      <h1
        id="dashboardTitle"
        className="euiScreenReaderOnly"
        ref={dashboardTitleRef}
        tabIndex={-1}
      >{`${getDashboardBreadcrumb()} - ${dashboardTitle}`}</h1>
      <navigationService.ui.TopNavMenu
        {...visibilityProps}
        query={query as Query | undefined}
        badges={badges}
        screenTitle={title}
        useDefaultBehaviors={true}
        savedQueryId={savedQueryId}
        indexPatterns={allDataViews ?? []}
        saveQueryMenuVisibility={allowSaveQuery ? 'allowed_by_app_privilege' : 'globally_managed'}
        appName={LEGACY_DASHBOARD_APP_ID}
        visible={viewMode !== 'print'}
        setMenuMountPoint={
          embedSettings || fullScreenMode
            ? setCustomHeaderActionMenu ?? undefined
            : setHeaderActionMenu
        }
        className={fullScreenMode ? 'kbnTopNavMenu-isFullScreen' : undefined}
        config={
          visibilityProps.showTopNavMenu
            ? viewMode === 'edit'
              ? editModeTopNavConfig
              : viewModeTopNavConfig
            : undefined
        }
        onQuerySubmit={(_payload, isUpdate) => {
          if (isUpdate === false) {
            dashboardApi.forceRefresh();
          }
        }}
        onSavedQueryIdChange={setSavedQueryId}
      />
      {viewMode !== 'print' && isLabsEnabled && isLabsShown ? (
        <PresentationUtilContextProvider>
          <LabsFlyout solutions={['dashboard']} onClose={() => setIsLabsShown(false)} />
        </PresentationUtilContextProvider>
      ) : null}
      {viewMode === 'edit' ? <DashboardEditingToolbar isDisabled={!!focusedPanelId} /> : null}
      {showBorderBottom && <EuiHorizontalRule margin="none" />}
    </div>
  );
}
