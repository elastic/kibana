/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UseUnmount from 'react-use/lib/useUnmount';

import type { EuiBreadcrumb, UseEuiTheme } from '@elastic/eui';
import {
  EuiBadge,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ControlsRenderer, type PublishesControlsLayout } from '@kbn/controls-renderer';
import type { MountPoint } from '@kbn/core/public';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { Query } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { getManagedContentBadge } from '@kbn/managed-content-badge';
import type { TopNavMenuBadgeProps, TopNavMenuProps } from '@kbn/navigation-plugin/public';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { LazyLabsFlyout, withSuspense } from '@kbn/presentation-util-plugin/public';
import { MountPointPortal } from '@kbn/react-kibana-mount';

import { AppMenu } from '@kbn/core-chrome-app-menu';
import { BehaviorSubject } from 'rxjs';
import { UI_SETTINGS } from '../../common/constants';
import { DASHBOARD_APP_ID } from '../../common/page_bundle_constants';
import type { SaveDashboardReturn } from '../dashboard_api/save_modal/types';
import { useDashboardApi } from '../dashboard_api/use_dashboard_api';
import { useDashboardInternalApi } from '../dashboard_api/use_dashboard_internal_api';
import {
  dashboardManagedBadge,
  getDashboardBreadcrumb,
  getDashboardTitle,
  topNavStrings,
} from '../dashboard_app/_dashboard_app_strings';
import { useDashboardMountContext } from '../dashboard_app/hooks/dashboard_mount_context';
import { useDashboardMenuItems } from '../dashboard_app/top_nav/use_dashboard_menu_items';
import type { DashboardEmbedSettings, DashboardRedirect } from '../dashboard_app/types';
import { openSettingsFlyout } from '../dashboard_renderer/settings/open_settings_flyout';
import { getDashboardRecentlyAccessedService } from '../services/dashboard_recently_accessed_service';
import {
  coreServices,
  dataService,
  serverlessService,
  unifiedSearchService,
} from '../services/kibana_services';
import { getDashboardCapabilities } from '../utils/get_dashboard_capabilities';
import { getFullEditPath } from '../utils/urls';
import { DashboardFavoriteButton } from './dashboard_favorite_button';
import { arePinnedPanelLayoutsEqual } from '../dashboard_api/layout_manager/are_layouts_equal';
import type { DashboardLayout } from '../dashboard_api/layout_manager';

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
  showBorderBottom = true,
  showResetChange = true,
}: InternalDashboardTopNavProps) {
  const [isChromeVisible, setIsChromeVisible] = useState(false);
  const [isLabsShown, setIsLabsShown] = useState(false);
  const dashboardTitleRef = useRef<HTMLHeadingElement>(null);

  const isLabsEnabled = useMemo(() => coreServices.uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI), []);
  const { onAppLeave } = useDashboardMountContext();

  const dashboardApi = useDashboardApi();
  const dashboardInternalApi = useDashboardInternalApi();

  const [
    allDataViews,
    fullScreenMode,
    hasUnsavedChanges,
    lastSavedId,
    query,
    title,
    viewMode,
    publishedChildFilters,
    unpublishedChildFilters,
    publishedTimeslice,
    unpublishedTimeslice,
    publishedEsqlVariables,
    unpublishedEsqlVariables,
  ] = useBatchedPublishingSubjects(
    dashboardApi.dataViews$,
    dashboardApi.fullScreenMode$,
    dashboardApi.hasUnsavedChanges$,
    dashboardApi.savedObjectId$,
    dashboardApi.query$,
    dashboardApi.title$,
    dashboardApi.viewMode$,
    dashboardApi.publishedChildFilters$,
    dashboardApi.unpublishedChildFilters$,
    dashboardApi.publishedTimeslice$,
    dashboardApi.unpublishedTimeslice$,
    dashboardInternalApi.publishedEsqlVariables$,
    dashboardInternalApi.unpublishedEsqlVariables$
  );

  const hasUnpublishedFilters = useMemo(() => {
    return !deepEqual(publishedChildFilters ?? [], unpublishedChildFilters ?? []);
  }, [publishedChildFilters, unpublishedChildFilters]);
  const hasUnpublishedTimeslice = useMemo(() => {
    return !deepEqual(publishedTimeslice, unpublishedTimeslice);
  }, [publishedTimeslice, unpublishedTimeslice]);
  const hasUnpublishedVariables = useMemo(() => {
    return !deepEqual(publishedEsqlVariables, unpublishedEsqlVariables);
  }, [publishedEsqlVariables, unpublishedEsqlVariables]);

  const [savedQueryId, setSavedQueryId] = useState<string | undefined>();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const dashboardTitle = useMemo(() => {
    return getDashboardTitle(title, viewMode, !lastSavedId);
  }, [title, viewMode, lastSavedId]);

  const styles = useMemoCss(topNavStyles);

  /**
   * focus on the top header when title or view mode is changed
   */
  useEffect(() => {
    dashboardTitleRef.current?.focus();
  }, [title, viewMode]);

  /*
   * Manage chrome visibility when dashboard is in print mode.
   */
  useEffect(() => {
    if (!embedSettings && viewMode === 'print') coreServices.chrome.setIsVisible(false);
  }, [embedSettings, viewMode]);

  /**
   * populate recently accessed, and set is chrome visible.
   */
  useEffect(() => {
    const subscription = coreServices.chrome
      .getIsVisible$()
      .subscribe((visible) => setIsChromeVisible(visible));

    if (lastSavedId && title) {
      const fullEditPath = getFullEditPath(lastSavedId, viewMode === 'edit');
      coreServices.chrome.recentlyAccessed.add(fullEditPath, title, lastSavedId);
      getDashboardRecentlyAccessedService().add(fullEditPath, title, lastSavedId); // used to sort the listing table
    }
    return () => subscription.unsubscribe();
  }, [lastSavedId, viewMode, title]);

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
                tabIndex={0}
                role="button"
                aria-label={topNavStrings.settings.description}
                size="s"
                type="pencil"
                onClick={() => openSettingsFlyout(dashboardApi)}
                css={styles.updateIcon}
              />
            </>
          ) : (
            dashboardTitle
          ),
        'aria-label': dashboardTitle,
      },
    ];

    if (serverlessService) {
      // set serverless breadcrumbs if available,
      // set only the dashboardTitleBreadcrumbs because the main breadcrumbs automatically come as part of the navigation config
      serverlessService.setBreadcrumbs(dashboardTitleBreadcrumbs);
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
        ]),
        {
          project: { value: dashboardTitleBreadcrumbs },
        }
      );
    }
  }, [
    redirectTo,
    dashboardTitle,
    dashboardApi,
    viewMode,
    customLeadingBreadCrumbs,
    styles.updateIcon,
  ]);

  /**
   * Build app leave handler whenever hasUnsavedChanges changes
   */
  useEffect(() => {
    onAppLeave((actions) => {
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
    const showSearchBar = showQueryInput || showDatePicker || showFilterBar;
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

    const { showWriteControls } = getDashboardCapabilities();
    if (showWriteControls && dashboardApi.isManaged) {
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
                        dashboardApi.runInteractiveSave().then((result) => maybeRedirect(result));
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
  }, [isPopoverOpen, dashboardApi, maybeRedirect]);

  useEffect(() => {
    coreServices.chrome.setBreadcrumbsBadges(badges);
    return () => {
      coreServices.chrome.setBreadcrumbsBadges([]);
    };
  }, [badges]);

  const setFavoriteButtonMountPoint = useCallback(
    (mountPoint: MountPoint<HTMLElement> | undefined) => {
      if (mountPoint) {
        return coreServices.chrome.setBreadcrumbsAppendExtension({
          content: mountPoint,
          order: 0,
        });
      }
    },
    []
  );

  /**
   * `ControlsRenderer` expects `controls` rather than `pinnedPanels` when rendering its layout; so,
   * we should map this to the expected key and keep them in sync
   */
  const dashboardWithControlsApi = useMemo(() => {
    const controlLayout: PublishesControlsLayout['layout$'] = new BehaviorSubject({
      controls: dashboardApi.layout$.getValue().pinnedPanels, // only controls can be pinned at the moment, so no need to filter
    });
    return { ...dashboardApi, layout$: controlLayout };
  }, [dashboardApi]);

  useEffect(() => {
    const syncControlsWithPinnedPanels = dashboardWithControlsApi.layout$.subscribe(
      ({ controls }) => {
        const currentLayout = dashboardApi.layout$.getValue();
        if (
          !arePinnedPanelLayoutsEqual({ pinnedPanels: controls } as DashboardLayout, currentLayout)
        ) {
          dashboardApi.layout$.next({ ...currentLayout, pinnedPanels: controls });
        }
      }
    );
    const syncPinnedPanelsWithControls = dashboardApi.layout$.subscribe((layout) => {
      const { controls: currentControls } = dashboardWithControlsApi.layout$.getValue();
      if (!deepEqual(currentControls, layout.pinnedPanels)) {
        dashboardWithControlsApi.layout$.next({
          controls: layout.pinnedPanels,
        });
      }
    });
    return () => {
      syncControlsWithPinnedPanels.unsubscribe();
      syncPinnedPanelsWithControls.unsubscribe();
    };
  }, [dashboardWithControlsApi, dashboardApi.layout$]);

  return (
    <div css={styles.container}>
      <EuiScreenReaderOnly>
        <h1
          id="dashboardTitle"
          ref={dashboardTitleRef}
        >{`${getDashboardBreadcrumb()} - ${dashboardTitle}`}</h1>
      </EuiScreenReaderOnly>
      <AppMenu
        setAppMenu={coreServices.chrome.setAppMenu}
        config={
          visibilityProps.showTopNavMenu
            ? viewMode === 'edit'
              ? editModeTopNavConfig
              : viewModeTopNavConfig
            : undefined
        }
      />
      {viewMode !== 'print' && visibilityProps.showSearchBar && (
        <unifiedSearchService.ui.SearchBar
          {...visibilityProps}
          query={query as Query | undefined}
          screenTitle={title}
          useDefaultBehaviors={true}
          savedQueryId={savedQueryId}
          indexPatterns={allDataViews ?? []}
          allowSavingQueries
          appName={DASHBOARD_APP_ID}
          onQuerySubmit={(_payload, isUpdate) => {
            if (isUpdate === false) {
              dashboardApi.forceRefresh();
            }
            if (hasUnpublishedFilters) dashboardApi.publishFilters();
            if (hasUnpublishedTimeslice) dashboardApi.publishTimeslice();
            if (hasUnpublishedVariables) dashboardInternalApi.publishVariables();
          }}
          onSavedQueryIdChange={setSavedQueryId}
          hasDirtyState={
            hasUnpublishedFilters || hasUnpublishedTimeslice || hasUnpublishedVariables
          }
          useBackgroundSearchButton={
            dataService.search.isBackgroundSearchEnabled &&
            getDashboardCapabilities().storeSearchSession
          }
        />
      )}
      {viewMode !== 'print' && isLabsEnabled && isLabsShown ? (
        <LabsFlyout solutions={['dashboard']} onClose={() => setIsLabsShown(false)} />
      ) : null}

      {viewMode !== 'print' ? <ControlsRenderer parentApi={dashboardWithControlsApi} /> : null}

      {showBorderBottom && <EuiHorizontalRule margin="none" />}
      <MountPointPortal setMountPoint={setFavoriteButtonMountPoint}>
        <DashboardFavoriteButton dashboardId={lastSavedId} />
      </MountPointPortal>
    </div>
  );
}

const topNavStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      '.kbnBody &': {
        width: '100%',
        position: 'sticky',
        zIndex: euiTheme.levels.mask,
        top: `var(--kbn-application--sticky-headers-offset, 0px)`,
        background: euiTheme.colors.backgroundBasePlain,

        [`@media (max-width: ${euiTheme.breakpoint.m}px)`]: {
          position: 'unset', // on smaller screens, the top nav should not be sticky
        },
      },
      '.controlGroup': {
        padding: euiTheme.size.s,
        paddingTop: 0,
      },
    }),
  updateIcon: ({ euiTheme }: UseEuiTheme) =>
    css({
      '.kbnBody &': {
        marginLeft: euiTheme.size.xs,
        marginTop: `calc(-1 * ${euiTheme.size.xxs})`,
        cursor: 'pointer',
      },
    }),
};
