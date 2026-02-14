/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import {
  EMPTY_DISCOVER_CONTEXT_AWARENESS_TOOLKIT,
  mergeDiscoverContextAwarenessToolkits,
  type DiscoverContextAwarenessToolkit,
  type DiscoverContextAwarenessToolkitOverrides,
} from './toolkit';

const discoverContextAwarenessToolkitContext = createContext<DiscoverContextAwarenessToolkit>(
  EMPTY_DISCOVER_CONTEXT_AWARENESS_TOOLKIT
);

export const ContextAwarenessToolkitProvider = ({
  value,
  children,
}: PropsWithChildren<{ value?: DiscoverContextAwarenessToolkitOverrides }>) => {
  const parent = useContext(discoverContextAwarenessToolkitContext);

  const toolkit = useMemo(
    () => mergeDiscoverContextAwarenessToolkits(parent, value),
    [parent, value]
  );

  return (
    <discoverContextAwarenessToolkitContext.Provider value={toolkit}>
      {children}
    </discoverContextAwarenessToolkitContext.Provider>
  );
};

export const useContextAwarenessToolkit = () => useContext(discoverContextAwarenessToolkitContext);
