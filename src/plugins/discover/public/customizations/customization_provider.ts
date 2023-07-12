/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { isFunction } from 'lodash';
import type { DiscoverStateContainer } from '../application/main/services/discover_state';
import type { CustomizationCallback } from './types';
import {
  createCustomizationService,
  DiscoverCustomizationId,
  DiscoverCustomizationService,
} from './customization_service';

const customizationContext = createContext(createCustomizationService());

export const DiscoverCustomizationProvider = customizationContext.Provider;

export const useDiscoverCustomizationService = ({
  customizationCallbacks,
  stateContainer,
}: {
  customizationCallbacks: CustomizationCallback[];
  stateContainer: DiscoverStateContainer;
}) => {
  const [customizationService, setCustomizationService] = useState<DiscoverCustomizationService>();

  const initFunction = () => {
    if (customizationService) return () => {};

    const customizations = createCustomizationService();

    const callbacks = customizationCallbacks.map((callback) =>
      callback({ customizations, stateContainer })
    );

    return Promise.all(callbacks).then((cleanups) => {
      setCustomizationService(customizations);

      return () => cleanups.filter(isFunction).forEach((cleanup) => cleanup());
    });
  };

  // Apply latest ref pattern to keep referential stability for the init function
  const ref = useRef<typeof initFunction>(initFunction);
  useEffect(() => {
    ref.current = initFunction;
  });
  const setupCustomizationService = useCallback(() => ref.current(), []);

  return { customizationService, setupCustomizationService };
};

export const useDiscoverCustomization$ = <TCustomizationId extends DiscoverCustomizationId>(
  id: TCustomizationId
) => useContext(customizationContext).get$(id);

export const useDiscoverCustomization = <TCustomizationId extends DiscoverCustomizationId>(
  id: TCustomizationId
) => useObservable(useDiscoverCustomization$(id));
