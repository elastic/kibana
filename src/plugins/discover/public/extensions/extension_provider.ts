/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createContext, useContext, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { isFunction } from 'lodash';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import type { RegisterExtensions } from '../plugin';
import { createExtensionRegistry, DiscoverExtensionId, DiscoverExtensionRegistry } from '.';
import type { DiscoverStateContainer } from '../application/main/services/discover_state';

const extensionContext = createContext<DiscoverExtensionRegistry>(createExtensionRegistry());

export const DiscoverExtensionProvider = extensionContext.Provider;

export const useDiscoverExtensionRegistry = ({
  registerExtensions,
  stateContainer,
}: {
  registerExtensions: RegisterExtensions[];
  stateContainer: DiscoverStateContainer;
}) => {
  const [extensionRegistry, setExtensionRegistry] = useState<DiscoverExtensionRegistry>();

  useEffectOnce(() => {
    const extensions = createExtensionRegistry();
    const registrations = registerExtensions.map((register) =>
      Promise.resolve(register({ extensions, stateContainer }))
    );
    const initialize = () => Promise.all(registrations).then((result) => result.filter(isFunction));

    initialize().then(() => {
      setExtensionRegistry(extensions);
    });

    return () => {
      initialize().then((cleanups) => {
        cleanups.forEach((cleanup) => cleanup());
      });
    };
  });

  return extensionRegistry;
};

export const useDiscoverExtension$ = <TExtensionId extends DiscoverExtensionId>(id: TExtensionId) =>
  useContext(extensionContext).get$(id);

export const useDiscoverExtension = <TExtensionId extends DiscoverExtensionId>(id: TExtensionId) =>
  useObservable(useDiscoverExtension$(id));
