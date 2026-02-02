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
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DiscoverStateContainer } from '../application/main/state_management/discover_state';
import type { CustomizationCallback, ExtendedDiscoverStateContainer } from './types';
import type {
  DiscoverCustomizationId,
  DiscoverCustomizationService,
} from './customization_service';
import { createCustomizationService } from './customization_service';
import { getInitialAppState } from '../application/main/state_management/utils/get_initial_app_state';
import type { DiscoverServices } from '../build_services';
import {
  fromSavedSearchToSavedObjectTab,
  internalStateActions,
} from '../application/main/state_management/redux';

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

export const getExtendedDiscoverStateContainer = (
  stateContainer: DiscoverStateContainer,
  services: DiscoverServices
): ExtendedDiscoverStateContainer => ({
  ...stateContainer,
  getAppStateFromSavedSearch: (newSavedSearch: SavedSearch) => {
    return getInitialAppState({
      initialUrlState: undefined,
      persistedTab: fromSavedSearchToSavedObjectTab({
        tab: stateContainer.getCurrentTab(),
        savedSearch: newSavedSearch,
        services,
      }),
      dataView: newSavedSearch.searchSource.getField('index'),
      services,
    });
  },
  internalActions: {
    fetchData: internalStateActions.fetchData,
    openDiscoverSession: internalStateActions.openDiscoverSession,
  },
});

export const getConnectedCustomizationService = async ({
  customizationCallbacks,
  stateContainer: originalStateContainer,
  services,
}: {
  customizationCallbacks: CustomizationCallback[];
  stateContainer: DiscoverStateContainer;
  services: DiscoverServices;
}): Promise<ConnectedCustomizationService> => {
  const customizations = createCustomizationService();
  const stateContainer = getExtendedDiscoverStateContainer(originalStateContainer, services);
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
