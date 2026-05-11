/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren, createContext, useContext, useMemo, useRef } from 'react';

interface ShortcutsContextValue {
  claimActiveLeaderKeyInstance: (instanceId: symbol) => void;
  releaseActiveLeaderKeyInstance: (instanceId: symbol) => void;
  hasOtherActiveLeaderKeyInstance: (instanceId: symbol) => boolean;
}

/**
 * Props for {@link ShortcutsProvider}.
 */
export type ShortcutsProviderProps = PropsWithChildren;

const ShortcutsContext = createContext<ShortcutsContextValue | undefined>(undefined);

/**
 * Provides shared keyboard shortcut coordination state to shortcut primitives.
 */
export const ShortcutsProvider = ({ children }: ShortcutsProviderProps) => {
  const activeLeaderKeyInstanceRef = useRef<symbol | undefined>();
  const value = useMemo<ShortcutsContextValue>(() => {
    return {
      claimActiveLeaderKeyInstance: (instanceId) => {
        activeLeaderKeyInstanceRef.current = instanceId;
      },
      releaseActiveLeaderKeyInstance: (instanceId) => {
        if (activeLeaderKeyInstanceRef.current === instanceId) {
          activeLeaderKeyInstanceRef.current = undefined;
        }
      },
      hasOtherActiveLeaderKeyInstance: (instanceId) => {
        return (
          activeLeaderKeyInstanceRef.current !== undefined &&
          activeLeaderKeyInstanceRef.current !== instanceId
        );
      },
    };
  }, []);

  return <ShortcutsContext.Provider value={value}>{children}</ShortcutsContext.Provider>;
};

export const useShortcutsContext = () => {
  const shortcutsContext = useContext(ShortcutsContext);

  if (shortcutsContext === undefined) {
    throw new Error('useShortcutsContext must be used within a ShortcutsProvider');
  }

  return shortcutsContext;
};
