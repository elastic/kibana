/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { isFunction } from 'lodash';
import type { DiscoverStateContainer } from '../application/main/services/discover_state';
import {
  createCustomizationService,
  DiscoverCustomizationId,
  DiscoverCustomizationService,
} from './customization_service';
import { useDiscoverProfiles } from './profiles_provider';

const customizationContext = createContext(createCustomizationService());

export const DiscoverCustomizationProvider = customizationContext.Provider;

export const useDiscoverCustomizationService = ({
  stateContainer,
}: {
  stateContainer: DiscoverStateContainer;
}) => {
  const { currentProfile } = useDiscoverProfiles();
  const [customizationService, setCustomizationService] = useState<DiscoverCustomizationService>();

  useEffect(() => {
    const customizations = createCustomizationService();
    const callbacks = currentProfile.customizationCallbacks.map((callback) =>
      Promise.resolve(callback({ customizations, stateContainer }))
    );
    const initialize = () => Promise.all(callbacks).then((result) => result.filter(isFunction));

    initialize().then(() => {
      setCustomizationService(customizations);
    });

    return () => {
      initialize().then((cleanups) => {
        cleanups.forEach((cleanup) => cleanup());
      });
    };
  }, [currentProfile.customizationCallbacks, stateContainer]);

  const isInitialized = Boolean(customizationService);

  return { customizationService, isInitialized };
};

export const useDiscoverCustomization$ = <TCustomizationId extends DiscoverCustomizationId>(
  id: TCustomizationId
) => useContext(customizationContext).get$(id);

export const useDiscoverCustomization = <TCustomizationId extends DiscoverCustomizationId>(
  id: TCustomizationId
) => useObservable(useDiscoverCustomization$(id));
