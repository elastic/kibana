/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../_dashboard_container.scss';

import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import classNames from 'classnames';
import useUnmount from 'react-use/lib/useUnmount';

import { EuiLoadingElastic, EuiLoadingSpinner } from '@elastic/eui';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import { ErrorEmbeddable, isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import {
  DashboardAPI,
  AwaitingDashboardAPI,
  buildApiFromDashboardContainer,
} from './dashboard_api';
import {
  DashboardCreationOptions,
  DashboardContainerFactory,
  DashboardContainerFactoryDefinition,
} from '../embeddable/dashboard_container_factory';
import { DashboardRedirect } from '../types';
import { DASHBOARD_CONTAINER_TYPE } from '..';
import { DashboardContainerInput } from '../../../common';
import type { DashboardContainer } from '../embeddable/dashboard_container';
import { Dashboard404Page } from './dashboard_404';

export interface DashboardRendererProps {
  savedObjectId?: string;
  showPlainSpinner?: boolean;
  dashboardRedirect?: DashboardRedirect;
  getCreationOptions?: () => Promise<DashboardCreationOptions>;
}

export const DashboardRenderer = forwardRef<AwaitingDashboardAPI, DashboardRendererProps>(
  ({ savedObjectId, getCreationOptions, dashboardRedirect, showPlainSpinner }, ref) => {
    const dashboardRoot = useRef(null);
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
        ) as DashboardContainerFactory & { create: DashboardContainerFactoryDefinition['create'] };
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

    return <div className={viewportClasses}>{renderDashboardContents()}</div>;
  }
);
