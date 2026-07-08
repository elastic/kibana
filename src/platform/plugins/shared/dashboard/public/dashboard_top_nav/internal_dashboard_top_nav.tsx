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
import { distinctUntilChanged, map } from 'rxjs';
import UseUnmount from 'react-use/lib/useUnmount';

import type { EuiBreadcrumb, UseEuiTheme } from '@elastic/eui';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiIcon,
  EuiHorizontalRule,
  EuiLink,
  EuiPopover,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { MountPoint } from '@kbn/core/public';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getManagedContentBadge } from '@kbn/managed-content-badge';
import type { TopNavMenuBadgeProps, TopNavMenuProps } from '@kbn/navigation-plugin/public';
import {
  apiPublishesUnifiedSearch,
  combineCompatibleChildrenApis,
  type PublishesUnifiedSearch,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { LazyLabsFlyout, withSuspense } from '@kbn/presentation-util-plugin/public';

import { AppMenu } from '@kbn/core-chrome-app-menu';
import { AppHeader, ChromeAppHeaderRegistration } from '@kbn/app-header';
import type { AppHeaderBadge } from '@kbn/app-header';
import { useChromeStyle, useIsNextChrome } from '@kbn/core-chrome-browser-hooks';
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
import { DashboardControlsRenderer } from '../dashboard_controls_renderer';

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

  const chromeStyle = useChromeStyle();
  // The header (title, app menu, badges, favorite) is rendered in one of three modes:
  //  - `inline`: standalone under the next chrome -> the page renders `AppHeader` itself.
  //  - `registered`: embedded in a host that owns the layout (e.g. Security Solution) under the next
  //    chrome -> the content is registered so chrome renders it in the app-header top-bar slot.
  //  - `legacy`: classic chrome, or the next chrome disabled -> content is pushed through the
  //    imperative chrome APIs (`setAppMenu`, `setBreadcrumbsBadges`, `setBreadcrumbsAppendExtension`).
  const isEmbedded = Boolean(embedSettings || setCustomHeaderActionMenu);
  const isAppHeaderActive = useIsNextChrome() && chromeStyle === 'project';
  const headerMode = !isAppHeaderActive ? 'legacy' : isEmbedded ? 'registered' : 'inline';

  const isLabsEnabled = useMemo(() => coreServices.uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI), []);
  const { onAppLeave } = useDashboardMountContext();

  const dashboardApi = useDashboardApi();
  const dashboardInternalApi = useDashboardInternalApi();

  const [
    allDataViews,
    fullScreenMode,
    hasUnsavedChanges,
    esqlApproximation,
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
    dashboardApi.isApproximate$,
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

  const [hasEsqlPanel, setHasEsqlPanel] = useState(false);
  useEffect(() => {
    const subscription = combineCompatibleChildrenApis<
      PublishesUnifiedSearch,
      (Query | AggregateQuery | undefined)[]
    >(dashboardApi, 'query$', apiPublishesUnifiedSearch, [])
      .pipe(
        map((queries) => queries.some((q) => isOfAggregateQueryType(q))),
        distinctUntilChanged()
      )
      .subscribe(setHasEsqlPanel);
    return () => subscription.unsubscribe();
  }, [dashboardApi]);

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
              <EuiButtonEmpty
                onClick={() => openSettingsFlyout(dashboardApi)}
                size="xs"
                aria-label={topNavStrings.settings.description}
                color="text"
                textProps={false}
                css={styles.updateEditButton}
              >
                <EuiIcon size="s" type="pencil" aria-hidden={true} />
              </EuiButtonEmpty>
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
    styles.updateEditButton,
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

  // Browser refresh/close with unsaved changes - only native confirmation, no custom message
  useEffect(() => {
    if (viewMode !== 'edit' || !hasUnsavedChanges) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [hasUnsavedChanges, viewMode]);

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
              aria-label={dashboardManagedBadge.getBadgeAriaLabel()}
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

  const appHeaderBadges = useMemo<AppHeaderBadge[]>(
    () =>
      (badges ?? []).map((badge) => ({
        label: badge.badgeText,
        renderCustomBadge: badge.renderCustomBadge,
      })),
    [badges]
  );

  const appMenuConfig = useMemo(() => {
    if (!visibilityProps.showTopNavMenu) {
      return undefined;
    }
    return viewMode === 'edit' ? editModeTopNavConfig : viewModeTopNavConfig;
  }, [visibilityProps.showTopNavMenu, viewMode, editModeTopNavConfig, viewModeTopNavConfig]);

  // In `inline`/`registered` modes badges and the favorite button are passed to the header
  // component directly (see render below). Only `legacy` mode pushes them through the chrome APIs.
  useEffect(() => {
    if (headerMode !== 'legacy') {
      return;
    }
    coreServices.chrome.setBreadcrumbsBadges(badges);
    return () => {
      coreServices.chrome.setBreadcrumbsBadges([]);
    };
  }, [badges, headerMode]);

  useEffect(() => {
    if (headerMode !== 'legacy') {
      return;
    }
    return coreServices.chrome.setBreadcrumbsAppendExtension({
      content: <DashboardFavoriteButton dashboardId={lastSavedId} />,
      order: 0,
    });
  }, [lastSavedId, headerMode]);

  return (
    <div css={styles.container}>
      <EuiScreenReaderOnly>
        <h1
          id="dashboardTitle"
          ref={dashboardTitleRef}
        >{`${getDashboardBreadcrumb()} - ${dashboardTitle}`}</h1>
      </EuiScreenReaderOnly>
      {headerMode === 'inline' && (
        <AppHeader
          title={dashboardTitle}
          menu={appMenuConfig}
          badges={appHeaderBadges}
          favorite={<DashboardFavoriteButton dashboardId={lastSavedId} />}
        />
      )}
      {headerMode === 'registered' && (
        <ChromeAppHeaderRegistration
          title={dashboardTitle}
          menu={appMenuConfig}
          badges={appHeaderBadges}
          favorite={<DashboardFavoriteButton dashboardId={lastSavedId} />}
        />
      )}
      {headerMode === 'legacy' && (
        <AppMenu setAppMenu={coreServices.chrome.setAppMenu} config={appMenuConfig} />
      )}
      {viewMode !== 'print' && visibilityProps.showSearchBar && (
        <unifiedSearchService.ui.SearchBar
          {...visibilityProps}
          query={query as Query | undefined}
          screenTitle={title}
          useDefaultBehaviors={true}
          savedQueryId={savedQueryId}
          indexPatterns={allDataViews ?? []}
          allowSavingQueries
          enableDateRangePicker
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
          esqlApproximation={{
            isApproximate: esqlApproximation ?? false,
            onChange: dashboardApi.setEsqlApproximation,
            disabled: !hasEsqlPanel,
            additionalText: i18n.translate('dashboard.esqlApproximationToggle.additionalText', {
              defaultMessage:
                'Fast mode requires at least one ES|QL visualization that uses STATS in the dashboard.',
            }),
          }}
        />
      )}
      {viewMode !== 'print' && isLabsEnabled && isLabsShown ? (
        <LabsFlyout solutions={['dashboard']} onClose={() => setIsLabsShown(false)} />
      ) : null}

      {viewMode !== 'print' ? <DashboardControlsRenderer /> : null}

      {showBorderBottom && <EuiHorizontalRule margin="none" />}
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
  updateEditButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      blockSize: '100%',
      marginLeft: euiTheme.size.xxs,
      padding: 0,
    }),
};
