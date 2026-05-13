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
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { CustomBrandingStart } from '@kbn/core-custom-branding-browser';

export interface ChromeComponentsDeps {
  application: Pick<
    InternalApplicationStart,
    'navigateToUrl' | 'currentAppId$' | 'currentActionMenu$'
  >;
  http: Pick<HttpStart, 'basePath' | 'getLoadingCount$'>;
  docLinks: DocLinksStart;
  customBranding: Pick<CustomBrandingStart, 'customBranding$'>;
}

const ChromeComponentsContext = createContext<ChromeComponentsDeps | null>(null);

/**
 * Provides `ChromeComponentsDeps` to all context-aware Chrome components (`Header`,
 * `ProjectHeader`, `GridLayoutProjectSideNav`, `HeaderTopBanner`, `ChromelessHeader`,
 * `AppMenuBar`, `Sidebar`).
 *
 * The layout layer passes whole service contracts (narrowed via `Pick`) and wraps the
 * layout tree once. Chrome-owned state is accessed separately via `useChromeService()` hooks.
 */
export const ChromeComponentsProvider: FC<PropsWithChildren<{ value: ChromeComponentsDeps }>> = ({
  value,
  children,
}) => <ChromeComponentsContext.Provider value={value}>{children}</ChromeComponentsContext.Provider>;

/**
 * Reads `ChromeComponentsDeps` from the nearest `ChromeComponentsProvider`.
 * Throws if called outside the provider.
 */
export const useChromeComponentsDeps = (): ChromeComponentsDeps => {
  const ctx = useContext(ChromeComponentsContext);
  if (!ctx) throw new Error('useChromeComponentsDeps must be used within ChromeComponentsProvider');
  return ctx;
};
