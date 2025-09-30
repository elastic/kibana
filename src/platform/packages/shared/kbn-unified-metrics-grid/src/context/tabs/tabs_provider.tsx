/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { createContext, useMemo } from 'react';
import type { TabActionPayload } from '../../store/slices';

const createTabActionInjector =
  (tabId: string) =>
  <TPayload extends TabActionPayload, TReturn>(actionCreator: (params: TPayload) => TReturn) =>
  (payload: VoidIfEmpty<WithoutTabId<TPayload>>) => {
    return actionCreator({ ...(payload ?? {}), tabId } as TPayload);
  };

export type TabActionInjector = ReturnType<typeof createTabActionInjector>;
interface TabsContextValue {
  tabId: string;
  injectCurrentTab: TabActionInjector;
}

type WithoutTabId<TPayload extends TabActionPayload> = Omit<TPayload, 'tabId'>;
type VoidIfEmpty<T> = keyof T extends never ? void : T;

export const TabsContext = createContext<TabsContextValue | undefined>(undefined);

export const TabsProvider = ({ tabId, children }: PropsWithChildren<{ tabId: string }>) => {
  const contextValue = useMemo<TabsContextValue>(
    () => ({
      tabId,
      injectCurrentTab: createTabActionInjector(tabId),
    }),
    [tabId]
  );

  return <TabsContext.Provider value={contextValue}>{children}</TabsContext.Provider>;
};
