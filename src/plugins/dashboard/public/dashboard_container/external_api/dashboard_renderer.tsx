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

import { EuiLoadingElastic, EuiLoadingSpinner } from '@elastic/eui';

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
import { DASHBOARD_CONTAINER_TYPE } from '..';
import { DashboardContainerInput } from '../../../common';
import type { DashboardContainer } from '../embeddable/dashboard_container';

export interface DashboardRendererProps {
  savedObjectId?: string;
  showPlainSpinner?: boolean;
  getCreationOptions?: () => Promise<DashboardCreationOptions>;
}

export const DashboardRenderer = forwardRef<AwaitingDashboardAPI, DashboardRendererProps>(
  ({ savedObjectId, getCreationOptions, showPlainSpinner }, ref) => {
    const dashboardRoot = useRef(null);
    const [loading, setLoading] = useState(true);
    const [screenshotMode, setScreenshotMode] = useState(false);
    const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer>();

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

    useEffect(() => {
      if (!dashboardContainer) return;

      // When a dashboard already exists, don't rebuild it, just set a new id.
      dashboardContainer.navigateToDashboard(savedObjectId);

      // Disabling exhaustive deps because this useEffect should only be triggered when the savedObjectId changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedObjectId]);

    const id = useMemo(() => uuidv4(), []);

    useEffect(() => {
      let canceled = false;
      let destroyContainer: () => void;

      (async () => {
        const creationOptions = await getCreationOptions?.();

        // Lazy loading all services is required in this component because it is exported and contributes to the bundle size.
        const { pluginServices } = await import('../../services/plugin_services');
        const { embeddable } = pluginServices.getServices();

        const dashboardFactory = embeddable.getEmbeddableFactory(
          DASHBOARD_CONTAINER_TYPE
        ) as DashboardContainerFactory & { create: DashboardContainerFactoryDefinition['create'] };
        const container = (await dashboardFactory?.create(
          { id } as unknown as DashboardContainerInput, // Input from creationOptions is used instead.
          undefined,
          creationOptions,
          savedObjectId
        )) as DashboardContainer;

        if (canceled) {
          container.destroy();
          return;
        }

        setLoading(false);
        if (dashboardRoot.current) {
          container.render(dashboardRoot.current);
        }

        setDashboardContainer(container);
        destroyContainer = () => container.destroy();
      })();
      return () => {
        canceled = true;
        destroyContainer?.();
      };
      // Disabling exhaustive deps because embeddable should only be created on first render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    return (
      <div className={viewportClasses}>
        {loading ? loadingSpinner : <div ref={dashboardRoot} />}
      </div>
    );
  }
);
