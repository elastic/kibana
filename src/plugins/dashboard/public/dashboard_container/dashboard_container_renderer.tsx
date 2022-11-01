/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './_dashboard_container.scss';

import uuid from 'uuid';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { PersistableControlGroupInput } from '@kbn/controls-plugin/common';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { DASHBOARD_CONTAINER_TYPE } from '..';
import { DashboardReduxState } from './types';
import { DashboardContainerInput } from '../../common';
import { pluginServices } from '../services/plugin_services';
import { DEFAULT_DASHBOARD_INPUT } from '../dashboard_constants';
import { DashboardContainer } from './embeddable/dashboard_container';
import { dashboardContainerReducers } from './state/dashboard_container_reducers';
import {
  DashboardContainerFactory,
  DashboardContainerFactoryDefinition,
  DashboardCreationOptions,
} from './embeddable/dashboard_container_factory';

export interface DashboardContainerRendererProps {
  savedObjectId?: string;
  getCreationOptions?: () => Promise<DashboardCreationOptions>;
  getInitialInput?: () => Partial<DashboardContainerInput>;
  onDashboardContainerLoaded?: (dashboardContainer: DashboardContainer) => void;
  onControlGroupInputLoaded?: (controlGroupInput: PersistableControlGroupInput) => void;
}

export const DashboardContainerRenderer = ({
  savedObjectId,
  getInitialInput,
  getCreationOptions,
  onControlGroupInputLoaded,
  onDashboardContainerLoaded,
}: DashboardContainerRendererProps) => {
  const dashboardRoot = useRef(null);
  const [dashboardIdToBuild, setDashboardIdToBuild] = useState<string | undefined>(savedObjectId);
  const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer>();

  useEffect(() => {
    // check if dashboard container is expecting id change... if not, update dashboard ID to build to force it to rebuild the container.
    if (!dashboardContainer) return;
    if (!dashboardContainer.isExpectingIdChange()) setDashboardIdToBuild(savedObjectId);

    // Disabling exhaustive deps because this useEffect should only be triggered when the savedObjectId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedObjectId]);

  const id = useMemo(() => uuid.v4(), []);

  useEffect(() => {
    let canceled = false;
    let destroyContainer: () => void;

    const { embeddable } = pluginServices.getServices();
    (async () => {
      const creationOptions = await getCreationOptions?.();
      const dashboardFactory = embeddable.getEmbeddableFactory(
        DASHBOARD_CONTAINER_TYPE
      ) as DashboardContainerFactory & { create: DashboardContainerFactoryDefinition['create'] };
      const container = (await dashboardFactory?.create(
        {
          id,
          ...DEFAULT_DASHBOARD_INPUT,
          ...getInitialInput?.(),
        },
        undefined,
        creationOptions
      )) as DashboardContainer;

      await container.untilInitialized();
      if (canceled) {
        container.destroy();
        return;
      }

      if (dashboardRoot.current) {
        container.render(dashboardRoot.current);
      }
      onDashboardContainerLoaded?.(container);
      setDashboardContainer(container);

      destroyContainer = () => container.destroy();
    })();
    return () => {
      canceled = true;
      destroyContainer?.();
    };
    // Disabling exhaustive deps because embeddable should only be created when the dashboardIdToBuild changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardIdToBuild]);

  return <div ref={dashboardRoot} />;
};

export const useDashboardContainerContext = () =>
  useReduxEmbeddableContext<
    DashboardReduxState,
    typeof dashboardContainerReducers,
    DashboardContainer
  >();

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default DashboardContainerRenderer;
