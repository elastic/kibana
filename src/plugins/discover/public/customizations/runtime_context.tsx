/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import React, { createContext, FC, useContext, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useDiscoverServices } from '../hooks/use_discover_services';
import { RuntimeContextManager } from './runtime_context_manager';

export interface DiscoverRuntimeContext extends SerializableRecord {
  returnLocation?: {
    url: string;
    title: string;
  };
}

export const createDiscoverRuntimeContext = (
  runtimeContext: Partial<DiscoverRuntimeContext> = {}
): Readonly<DiscoverRuntimeContext> => {
  return {
    returnLocation: runtimeContext.returnLocation,
  };
};

const runtimeContext = createContext(createDiscoverRuntimeContext());

export const DiscoverRuntimeContextProvider: FC = ({ children }) => {
  const { storage } = useDiscoverServices();
  const [runtimeContextManager] = useState(() => new RuntimeContextManager(storage));
  const { location } = useHistory();

  const contextId = useMemo(
    () => new URLSearchParams(location.search).get('contextId') ?? undefined,
    [location.search]
  );

  const context = useMemo(
    () => runtimeContextManager.restoreContext(contextId),
    [contextId, runtimeContextManager]
  );

  return <runtimeContext.Provider value={context}>{children}</runtimeContext.Provider>;
};

export const useDiscoverRuntimeContext = () => useContext(runtimeContext);
