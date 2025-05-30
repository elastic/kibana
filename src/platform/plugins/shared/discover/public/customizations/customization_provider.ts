/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { isFunction } from 'lodash';
import type { DiscoverStateContainer } from '../application/main/state_management/discover_state';
import type { CustomizationCallback } from './types';
import type {
  DiscoverCustomizationId,
  DiscoverCustomizationService,
} from './customization_service';
import { createCustomizationService } from './customization_service';

const customizationContext = createContext(createCustomizationService());

export const DiscoverCustomizationProvider = customizationContext.Provider;

export const useDiscoverCustomization$ = <TCustomizationId extends DiscoverCustomizationId>(
  id: TCustomizationId
) => useContext(customizationContext).get$(id);

export const useDiscoverCustomization = <TCustomizationId extends DiscoverCustomizationId>(
  id: TCustomizationId
) => {
  const customizationService = useContext(customizationContext);
  return useObservable(customizationService.get$(id), customizationService.get(id));
};

export interface ConnectedCustomizationService extends DiscoverCustomizationService {
  cleanup: () => Promise<void>;
}

export const getConnectedCustomizationService = async ({
  customizationCallbacks,
  stateContainer,
}: {
  customizationCallbacks: CustomizationCallback[];
  stateContainer: DiscoverStateContainer;
}): Promise<ConnectedCustomizationService> => {
  const customizations = createCustomizationService();
  const callbacks = customizationCallbacks.map((callback) =>
    Promise.resolve(callback({ customizations, stateContainer }))
  );
  const initialize = () => Promise.all(callbacks).then((result) => result.filter(isFunction));

  // TODO: Race condition?
  await initialize();

  return {
    ...customizations,
    cleanup: async () => {
      const cleanups = await initialize();
      cleanups.forEach((cleanup) => cleanup());
    },
  };
};
