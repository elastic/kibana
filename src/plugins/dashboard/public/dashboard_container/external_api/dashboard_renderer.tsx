/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '../_dashboard_container.scss';

import classNames from 'classnames';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import { v4 as uuidv4 } from 'uuid';

import { EuiLoadingElastic, EuiLoadingSpinner } from '@elastic/eui';
import { ErrorEmbeddable, isErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';

import { LocatorPublic } from '@kbn/share-plugin/common';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
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
import { DashboardApi } from '../../dashboard_api/types';
import { pluginServices } from '../../services/plugin_services';

export interface DashboardRendererProps {
  onApiAvailable: (api: DashboardApi) => void;
  savedObjectId?: string;
  showPlainSpinner?: boolean;
  dashboardRedirect?: DashboardRedirect;
  getCreationOptions?: () => Promise<DashboardCreationOptions>;
  locator?: Pick<LocatorPublic<DashboardLocatorParams>, 'navigate' | 'getRedirectUrl'>;
}

export function DashboardRenderer({
  savedObjectId,
  getCreationOptions,
  dashboardRedirect,
  showPlainSpinner,
  locator,
  onApiAvailable,
}: DashboardRendererProps) {
  const dashboardRoot = useRef(null);
  const dashboardViewport = useRef(null);
  const [loading, setLoading] = useState(true);
  const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer>();
  const [fatalError, setFatalError] = useState<ErrorEmbeddable | undefined>();
  const [dashboardMissing, setDashboardMissing] = useState(false);

  const { embeddable, screenshotMode } = pluginServices.getServices();

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
      onApiAvailable(container as DashboardApi);
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
            dashboardApi={dashboardContainer}
          />
        )}
      {renderDashboardContents()}
    </div>
  );
}

/**
 * Maximizing a panel in Dashboard only works if the parent div has a certain class. This
 * small component listens to the Dashboard's expandedPanelId state and adds and removes
 * the class to whichever element renders the Dashboard.
 */
const ParentClassController = ({
  dashboardApi,
  viewportRef,
}: {
  dashboardApi: DashboardApi;
  viewportRef: HTMLDivElement;
}) => {
  const maximizedPanelId = useStateFromPublishingSubject(dashboardApi.expandedPanelId);

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
