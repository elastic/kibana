/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import '../_dashboard_container.scss';

import { v4 as uuidv4 } from 'uuid';
import classNames from 'classnames';
import { EuiLoadingElastic } from '@elastic/eui';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  DashboardCreationOptions,
  DashboardContainerFactory,
  DashboardContainerFactoryDefinition,
} from '../embeddable/dashboard_container_factory';
import { DashboardAPI, DASHBOARD_CONTAINER_TYPE } from '..';
import { DashboardContainerInput } from '../../../common';
import type { DashboardContainer } from '../embeddable/dashboard_container';
import { buildApiFromDashboardContainer } from './dashboard_api';

export interface DashboardRendererProps {
  savedObjectId?: string;
  getCreationOptions?: () => DashboardCreationOptions;
}

export const DashboardRenderer = forwardRef<DashboardAPI | undefined, DashboardRendererProps>(
  ({ savedObjectId, getCreationOptions }, ref) => {
    const dashboardRoot = useRef(null);
    const [loading, setLoading] = useState(true);
    const [screenshotMode, setScreenshotMode] = useState(false);
    const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer>();
    const [dashboardIdToBuild, setDashboardIdToBuild] = useState<string | undefined>(savedObjectId);

    useImperativeHandle(ref, () => buildApiFromDashboardContainer(dashboardContainer), [
      dashboardContainer,
    ]);

    useEffect(() => {
      (async () => {
        // Lazy loading all services is required in this component because it is exported and contributes to the bundle size.
        const { pluginServices } = await import('../../services/plugin_services');
        const {
          screenshotMode: { isScreenshotMode },
        } = pluginServices.getServices();
        setScreenshotMode(isScreenshotMode());
      })();
    });

    useEffect(() => {
      // check if dashboard container is expecting id change... if not, update dashboardIdToBuild to force it to rebuild the container.
      if (!dashboardContainer) return;
      if (!dashboardContainer.isExpectingIdChange()) setDashboardIdToBuild(savedObjectId);

      // Disabling exhaustive deps because this useEffect should only be triggered when the savedObjectId changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedObjectId]);

    const id = useMemo(() => uuidv4(), []);

    useEffect(() => {
      let canceled = false;

      (async () => {
        const creationOptions = getCreationOptions?.();

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
      })();
      return () => {
        canceled = true;
        dashboardContainer?.destroy();
      };
      // Disabling exhaustive deps because embeddable should only be created when the dashboardIdToBuild changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dashboardIdToBuild]);

    const viewportClasses = classNames(
      'dashboardViewport',
      { 'dashboardViewport--screenshotMode': screenshotMode },
      { 'dashboardViewport--loading': loading }
    );
    return (
      <div className={viewportClasses}>
        {loading ? <EuiLoadingElastic size="xxl" /> : <div ref={dashboardRoot} />}
      </div>
    );
  }
);
