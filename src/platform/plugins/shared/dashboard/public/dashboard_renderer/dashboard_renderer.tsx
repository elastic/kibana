/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiEmptyPrompt,
  EuiLoadingElastic,
  EuiLoadingSpinner,
  useEuiPaddingSize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { apm } from '@elastic/apm-rum';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import { ExitFullScreenButtonKibanaProvider } from '@kbn/shared-ux-button-exit-full-screen';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DashboardLocatorParams } from '../../common';
import type { DashboardApi, DashboardInternalApi } from '../dashboard_api/types';
import type { DashboardCreationOptions } from '..';
import { loadDashboardApi } from '../dashboard_api/load_dashboard_api';
import { DashboardContext } from '../dashboard_api/use_dashboard_api';
import { DashboardInternalContext } from '../dashboard_api/use_dashboard_internal_api';
import type { DashboardRedirect } from '../dashboard_app/types';
import { coreServices, screenshotModeService, uiActionsService } from '../services/kibana_services';

import { Dashboard404Page } from './dashboard_404';
import { DashboardViewport } from './viewport/dashboard_viewport';
import { GlobalPrintStyles } from './print_styles';
import { DashboardControlsRenderer } from '../dashboard_controls_renderer';

/**
 * Props for the {@link DashboardRenderer} component.
 */
export interface DashboardRendererProps {
  /** Optional locator for dashboard navigation and URL generation. */
  locator?: Pick<LocatorPublic<DashboardLocatorParams>, 'navigate' | 'getRedirectUrl'>;
  /** The ID of the saved dashboard to load. If not provided, creates a new dashboard. */
  savedObjectId?: string;
  /** Whether to show a plain spinner instead of the Elastic loading animation. */
  showPlainSpinner?: boolean;
  /**
   * Flyout type for panel flyouts (Settings, Lens config, etc.) opened from this dashboard.
   * Use `overlay` when the dashboard is embedded in a host that already uses a push flyout
   * (e.g. Agent Builder canvas).
   */
  panelFlyoutType?: EuiFlyoutProps['type'];
  /** Callback for redirecting within the dashboard application. */
  dashboardRedirect?: DashboardRedirect;
  /** Function that returns the creation options for the dashboard. */
  getCreationOptions?: () => Promise<DashboardCreationOptions>;
  /**
   * Callback invoked when the dashboard API becomes available.
   *
   * @param api - The {@link DashboardApi} instance.
   * @param internalApi - The {@link DashboardInternalApi} instance.
   */
  onApiAvailable?: (api: DashboardApi, internalApi: DashboardInternalApi) => void;
  /**
   * Callback invoked when the dashboard API is destroyed.
   */
  onApiCleanup?: () => void;
}

export function DashboardRenderer({
  locator,
  savedObjectId,
  showPlainSpinner,
  panelFlyoutType,
  dashboardRedirect,
  getCreationOptions,
  onApiAvailable,
  onApiCleanup,
}: DashboardRendererProps) {
  const dashboardViewport = useRef(null);
  const dashboardContainerRef = useRef<HTMLElement | null>(null);
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>();
  const [dashboardInternalApi, setDashboardInternalApi] = useState<
    DashboardInternalApi | undefined
  >();
  const [error, setError] = useState<Error | undefined>();
  /** Default showControlGroup to true. This simplifies embedding DashboardRenderer outside of the dashboard app,
   *  ensuring that DashboardRenderer, by default, will never fail to render a dashboard due to missing controls.
   *  Other contexts that want to render the control group in a different location in the UI should explicitly set
   *  `useControlsIntegration` to `false` in their `getCreationOptions` function
   */
  const [showControlGroup, setShowControlGroup] = useState<boolean>(true);

  const euiPaddingS = useEuiPaddingSize('s');
  const styles = useMemo(
    () => ({
      renderer: css({
        display: 'flex',
        flex: 'auto',
        width: '100%',
        flexDirection: 'column',
        '&.dashboardViewport--loading': {
          justifyContent: 'center',
          alignItems: 'center',
        },
        '& .controlGroup': {
          padding: `0 ${euiPaddingS}`,
        },
      }),
    }),
    [euiPaddingS]
  );

  useEffect(() => {
    /* In case the locator prop changes, we need to reassign the value in the container */
    if (dashboardApi) dashboardApi.locator = locator;
  }, [dashboardApi, locator]);

  useEffect(() => {
    if (
      dashboardInternalApi &&
      dashboardInternalApi.dashboardContainerRef$.value !== dashboardContainerRef.current
    ) {
      dashboardInternalApi.setDashboardContainerRef(dashboardContainerRef.current);
    }
  }, [dashboardInternalApi]);

  useEffect(() => {
    if (error) setError(undefined);
    if (dashboardApi) setDashboardApi(undefined);
    if (dashboardInternalApi) setDashboardInternalApi(undefined);

    let canceled = false;
    let cleanupDashboardApi: (() => void) | undefined;
    loadDashboardApi({ getCreationOptions, onApiCleanup, savedObjectId, panelFlyoutType })
      .then((results) => {
        if (!results) return;
        if (canceled) {
          results.cleanup();
          return;
        }

        cleanupDashboardApi = results.cleanup;
        setDashboardApi(results.api);
        setDashboardInternalApi(results.internalApi);
        onApiAvailable?.(results.api, results.internalApi);
        if (typeof results.useControlsIntegration !== 'undefined')
          setShowControlGroup(results.useControlsIntegration);
      })
      .catch((err) => {
        if (!canceled) {
          apm.captureError(err, {
            labels: {
              error_type: 'LoadDashboardFailure',
            },
          });
          setError(err);
        }
      });

    return () => {
      cleanupDashboardApi?.();
      canceled = true;
    };
    // Disabling exhaustive deps because embeddable should only be created on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedObjectId]);

  const isDashboardViewportLoading = !dashboardApi && !error;

  const viewportClasses = classNames(
    'dashboardViewport',
    { 'dashboardViewport--screenshotMode': screenshotModeService.isScreenshotMode() },
    { 'dashboardViewport--loading': isDashboardViewportLoading }
  );

  const loadingSpinner = showPlainSpinner ? (
    <EuiLoadingSpinner size="xxl" />
  ) : (
    <EuiLoadingElastic size="xxl" />
  );

  const renderDashboardContents = () => {
    if (error) {
      return error instanceof SavedObjectNotFound ? (
        <Dashboard404Page dashboardRedirect={dashboardRedirect} />
      ) : (
        <EuiEmptyPrompt
          iconType="error"
          iconColor="danger"
          title={
            <h2>
              {i18n.translate('dashboard.dashboardRenderer.loadDashboardErrorTitle', {
                defaultMessage: 'Unable to load dashboard',
              })}
            </h2>
          }
          body={<p>{error.message}</p>}
        />
      );
    }

    return dashboardApi && dashboardInternalApi ? (
      <div
        className="dashboardContainer"
        data-test-subj="dashboardContainer"
        css={styles.renderer}
        ref={(e) => {
          if (dashboardInternalApi && dashboardInternalApi.dashboardContainerRef$.value !== e) {
            dashboardInternalApi.setDashboardContainerRef(e);
          }
          dashboardContainerRef.current = e;
        }}
      >
        <GlobalPrintStyles />
        <ExitFullScreenButtonKibanaProvider
          coreStart={{ chrome: coreServices.chrome, customBranding: coreServices.customBranding }}
        >
          <KibanaContextProvider services={{ uiActions: uiActionsService }}>
            <DashboardContext.Provider value={dashboardApi}>
              <DashboardInternalContext.Provider value={dashboardInternalApi}>
                {showControlGroup && <DashboardControlsRenderer />}
                <DashboardViewport />
              </DashboardInternalContext.Provider>
            </DashboardContext.Provider>
          </KibanaContextProvider>
        </ExitFullScreenButtonKibanaProvider>
      </div>
    ) : (
      loadingSpinner
    );
  };

  return (
    <div ref={dashboardViewport} className={viewportClasses} css={styles.renderer}>
      {dashboardViewport?.current && dashboardApi && (
        <ParentClassController
          viewportRef={dashboardViewport.current}
          dashboardApi={dashboardApi}
        />
      )}
      {renderDashboardContents()}
    </div>
  );
}

/**
 * Maximizing a panel only works when a surrounding element carries a certain class. This
 * small component listens to the Dashboard's expandedPanelId state and toggles that class
 * on the app wrapper. It targets the app wrapper rather than the renderer's immediate
 * parent because, when the Dashboard is embedded (for example in the Security solution),
 * that parent can be a nested flex item that does not fill the viewport, which leaves the
 * maximized panel with no height.
 */
const ParentClassController = ({
  dashboardApi,
  viewportRef,
}: {
  dashboardApi: DashboardApi;
  viewportRef: HTMLDivElement;
}) => {
  const maximizedPanelId = useStateFromPublishingSubject(dashboardApi.expandedPanelId$);

  useLayoutEffect(() => {
    const wrapper = viewportRef.closest(`.${APP_WRAPPER_CLASS}`) ?? viewportRef.parentElement;
    if (!wrapper) return;

    if (maximizedPanelId) {
      wrapper.classList.add('dshDashboardViewportWrapper');
    } else {
      wrapper.classList.remove('dshDashboardViewportWrapper');
    }
  }, [maximizedPanelId, viewportRef]);
  return null;
};
