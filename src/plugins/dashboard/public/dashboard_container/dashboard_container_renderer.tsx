/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './_dashboard_container.scss';

import uuid from 'uuid';
import useLifecycles from 'react-use/lib/useLifecycles';
import React, { useMemo, useRef, useState } from 'react';

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
  getCreationOptions?: () => Promise<DashboardCreationOptions>;
  getInitialInput?: () => Partial<DashboardContainerInput>;
  onDashboardContainerLoaded?: (dashboardContainer: DashboardContainer) => void;
  onControlGroupInputLoaded?: (controlGroupInput: PersistableControlGroupInput) => void;
}

export const DashboardContainerRenderer = ({
  getInitialInput,
  getCreationOptions,
  onControlGroupInputLoaded,
  onDashboardContainerLoaded,
}: DashboardContainerRendererProps) => {
  const dashboardRoot = useRef(null);
  const [dashboardContainer, setDashboardContainer] = useState<DashboardContainer>();

  const id = useMemo(() => uuid.v4(), []);

  /**
   * Use Lifecycles to load initial dashboard container
   */
  useLifecycles(
    () => {
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

        if (dashboardRoot.current) {
          container.render(dashboardRoot.current);
        }
        setDashboardContainer(container);
        onDashboardContainerLoaded?.(container);
      })();
    },
    () => {
      dashboardContainer?.destroy();
    }
  );

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
