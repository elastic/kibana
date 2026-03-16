/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useContext } from 'react';
import type {
  ChromeApplicationContext,
  ChromeComponentsConfig,
  ChromeComponentsDeps,
} from '@kbn/core-chrome-browser-internal-types';

export type { ChromeApplicationContext, ChromeComponentsConfig, ChromeComponentsDeps };

const ChromeComponentsContext = createContext<ChromeComponentsDeps | null>(null);

/**
 * Provides `ChromeComponentsDeps` to all context-aware Chrome components (`Header`,
 * `ProjectHeader`, `GridLayoutProjectSideNav`, `HeaderTopBanner`, `ChromelessHeader`,
 * `AppMenuBar`, `Sidebar`). Wrap the layout tree once with `chrome.componentDeps`.
 *
 * @temporary This provider is a stepping stone toward a proper `ChromeStateProvider` that will
 * expose React hooks (`useChromeStyle`, `useChromeBreadcrumbs`, etc.) and allow components to
 * self-hydrate without Observable props. Once that package exists this provider can be replaced.
 * @see kibana-team#2651 (Chrome & Grid Evolution epic — private repo)
 */
export const ChromeComponentsProvider: FC<PropsWithChildren<{ value: ChromeComponentsDeps }>> = ({
  value,
  children,
}) => <ChromeComponentsContext.Provider value={value}>{children}</ChromeComponentsContext.Provider>;

/**
 * Reads `ChromeComponentsDeps` from the nearest `ChromeComponentsProvider`.
 * Throws if called outside the provider.
 *
 * @temporary See `ChromeComponentsProvider` for the migration plan.
 */
export const useChromeComponentsDeps = (): ChromeComponentsDeps => {
  const ctx = useContext(ChromeComponentsContext);
  if (!ctx) throw new Error('useChromeComponentsDeps must be used within ChromeComponentsProvider');
  return ctx;
};
