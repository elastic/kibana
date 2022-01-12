/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactElement } from 'react';
import React from 'react';

import { ControlGroupInput } from '../types';
import { pluginServices } from '../../services';
import { toMountPoint } from '../../../../kibana_react/public';
import {
  ReduxContainerContextServices,
  ReduxEmbeddableContext,
} from '../../../../presentation_util/public';

/**
 * The overlays service creates its divs outside the flow of the component. This necessitates
 * passing all context from the component to the flyout.
 */
export const forwardAllContext = (
  component: ReactElement,
  reduxContainerContext: ReduxContainerContextServices<ControlGroupInput>
) => {
  const PresentationUtilProvider = pluginServices.getContextProvider();
  const StoreProvider = reduxContainerContext.ReduxEmbeddableStoreProvider;
  return toMountPoint(
    <StoreProvider>
      <ReduxEmbeddableContext.Provider value={reduxContainerContext}>
        <PresentationUtilProvider>{component}</PresentationUtilProvider>
      </ReduxEmbeddableContext.Provider>
    </StoreProvider>
  );
};
