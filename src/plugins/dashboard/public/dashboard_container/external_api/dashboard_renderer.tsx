/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../_dashboard_container.scss';

import classNames from 'classnames';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import { v4 as uuidv4 } from 'uuid';

import { EuiLoadingElastic, EuiLoadingSpinner } from '@elastic/eui';
import { ErrorEmbeddable, isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';

import { LocatorPublic } from '@kbn/share-plugin/common';
import { DASHBOARD_CONTAINER_TYPE } from '..';
import { DashboardContainerInput } from '../../../common';
import type { DashboardContainer } from '../embeddable/dashboard_container';
import {
  DashboardContainerFactory,
  DashboardContainerFactoryDefinition,
  DashboardCreationOptions,
} from '../embeddable/dashboard_container_factory';
import { DashboardLocatorParams, DashboardRedirect } from '../types';
import { Dashboard404Page } from './dashboard_404';
import {
  AwaitingDashboardAPI,
  buildApiFromDashboardContainer,
  DashboardAPI,
} from './dashboard_api';

export interface DashboardRendererProps {
  savedObjectId?: string;
  showPlainSpinner?: boolean;
  dashboardRedirect?: DashboardRedirect;
  getCreationOptions?: () => Promise<DashboardCreationOptions>;
  locator?: Pick<LocatorPublic<DashboardLocatorParams>, 'navigate' | 'getRedirectUrl'>;
}

export const DashboardRenderer = forwardRef<AwaitingDashboardAPI, DashboardRendererProps>(
  ({ savedObjectId, getCreationOptions, dashboardRedirect, showPlainSpinner, locator }, ref) => {
    const dashboardRoot = useRef(null);
    const dashboardViewport = useRef(null);
    const [loading, setLoading] = useState(true);
    const [screenshotMode, setScreenshotMode] = useState(false);
    const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer>();
    const [fatalError, setFatalError] = useState<ErrorEmbeddable | undefined>();
    const [dashboardMissing, setDashboardMissing] = useState(false);

    useImperativeHandle(
      ref,
      () => buildApiFromDashboardContainer(dashboardContainer) as DashboardAPI,
      [dashboardContainer]
    );

    useEffect(() => {
      (async () => {
        // Lazy loading all services is required in this component because it is exported and contributes to the bundle size.
        const { pluginServices } = await import('../../services/plugin_services');
        const {
          screenshotMode: { isScreenshotMode },
        } = pluginServices.getServices();
        setScreenshotMode(isScreenshotMode());
      })();
    }, []);

    const id = useMemo(() => uuidv4(), []);

    useEffect(() => {
      /* In case the locator prop changes, we need to reassign the value in the container */
      if (dashboardContainer) dashboardContainer.locator = locator;
    }, [dashboardContainer, locator]);

    useEffect(() => {
      /**
       * Here we attempt to build a dashboard or navigate to a new dashboard. Clear all error states
       * if they exist in case this dashboard loads correctly.
       */
      fatalError?.destroy();
      setDashboardMissing(false);
      setFatalError(undefined);

      if (dashboardContainer) {
        // When a dashboard already exists, don't rebuild it, just set a new id.
        dashboardContainer.navigateToDashboard(savedObjectId).catch((e) => {
          dashboardContainer?.destroy();
          setDashboardContainer(undefined);
          setFatalError(new ErrorEmbeddable(e, { id }));
          if (e instanceof SavedObjectNotFound) {
            setDashboardMissing(true);
          }
        });
        return;
      }

      setLoading(true);
      let canceled = false;
      (async () => {
        const creationOptions = await getCreationOptions?.();

        // Lazy loading all services is required in this component because it is exported and contributes to the bundle size.
        const { pluginServices } = await import('../../services/plugin_services');
        const { embeddable } = pluginServices.getServices();

        const dashboardFactory = embeddable.getEmbeddableFactory(
          DASHBOARD_CONTAINER_TYPE
        ) as DashboardContainerFactory & {
          create: DashboardContainerFactoryDefinition['create'];
        };
        const container = await dashboardFactory?.create(
          { id } as unknown as DashboardContainerInput, // Input from creationOptions is used instead.
          undefined,
          creationOptions,
          savedObjectId
        );
        setLoading(false);

        if (canceled || !container) {
          setDashboardContainer(undefined);
          container?.destroy();
          return;
        }

        if (isErrorEmbeddable(container)) {
          setFatalError(container);
          if (container.error instanceof SavedObjectNotFound) {
            setDashboardMissing(true);
          }
          return;
        }

        if (dashboardRoot.current) {
          container.render(dashboardRoot.current);
        }

        setDashboardContainer(container);
      })();
      return () => {
        canceled = true;
      };
      // Disabling exhaustive deps because embeddable should only be created on first render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedObjectId]);

    useUnmount(() => {
      fatalError?.destroy();
      dashboardContainer?.destroy();
    });

    const viewportClasses = classNames(
      'dashboardViewport',
      { 'dashboardViewport--screenshotMode': screenshotMode },
      { 'dashboardViewport--loading': loading }
    );

    const loadingSpinner = showPlainSpinner ? (
      <EuiLoadingSpinner size="xxl" />
    ) : (
      <EuiLoadingElastic size="xxl" />
    );

    const renderDashboardContents = () => {
      if (dashboardMissing) return <Dashboard404Page dashboardRedirect={dashboardRedirect} />;
      if (fatalError) return fatalError.render();
      if (loading) return loadingSpinner;
      return <div ref={dashboardRoot} />;
    };

    return (
      <div ref={dashboardViewport} className={viewportClasses}>
        {dashboardViewport?.current &&
          dashboardContainer &&
          !isErrorEmbeddable(dashboardContainer) && (
            <ParentClassController
              viewportRef={dashboardViewport.current}
              dashboard={dashboardContainer}
            />
          )}
        {renderDashboardContents()}
      </div>
    );
  }
);

/**
 * Maximizing a panel in Dashboard only works if the parent div has a certain class. This
 * small component listens to the Dashboard's expandedPanelId state and adds and removes
 * the class to whichever element renders the Dashboard.
 */
const ParentClassController = ({
  dashboard,
  viewportRef,
}: {
  dashboard: DashboardContainer;
  viewportRef: HTMLDivElement;
}) => {
  const maximizedPanelId = dashboard.select((state) => state.componentState.expandedPanelId);

  useLayoutEffect(() => {
    const parentDiv = viewportRef.parentElement;
    if (!parentDiv) return;

    if (maximizedPanelId) {
      parentDiv.classList.add('dshDashboardViewportWrapper');
    } else {
      parentDiv.classList.remove('dshDashboardViewportWrapper');
    }
  }, [maximizedPanelId, viewportRef.parentElement]);
  return null;
};
