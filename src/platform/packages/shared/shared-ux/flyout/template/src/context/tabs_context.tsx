/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { HeaderTabDescriptor } from '../header/tab/types';

export interface FlyoutTabsState {
  tabs: HeaderTabDescriptor[];
  selectedTabId: string | undefined;
  selectTab: (id: string) => void;
  /** Whether the body declares at least one `Body.TabPanel`. Gates the tab bar. */
  hasTabPanels: boolean;
}

const DEFAULT_TABS_STATE: FlyoutTabsState = {
  tabs: [],
  selectedTabId: undefined,
  selectTab: () => {},
  hasTabPanels: false,
};

const FlyoutTabsContext = createContext<FlyoutTabsState>(DEFAULT_TABS_STATE);

export const FlyoutTabsProvider = ({
  value,
  children,
}: {
  value: FlyoutTabsState;
  children: ReactNode;
}) => <FlyoutTabsContext.Provider value={value}>{children}</FlyoutTabsContext.Provider>;

export const useFlyoutTabs = (): FlyoutTabsState => useContext(FlyoutTabsContext);
