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
import type { Observable } from 'rxjs';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { MountPoint } from '@kbn/core-mount-utils-browser';

/**
 * Minimal application contract needed by Chrome components.
 * Replaces `InternalApplicationStart` to break the dependency on the private
 * `@kbn/core-application-browser-internal` package.
 */
export interface ChromeApplicationContext
  extends Pick<ApplicationStart, 'navigateToApp' | 'navigateToUrl' | 'currentAppId$'> {
  currentActionMenu$: Observable<MountPoint<HTMLElement> | undefined>;
}

export interface ChromeComponentsDeps {
  application: ChromeApplicationContext;
  basePath: HttpStart['basePath'];
  docLinks: DocLinksStart;
  loadingCount$: Observable<number>;
  customBranding$: Observable<CustomBranding>;
}

const ChromeComponentsContext = createContext<ChromeComponentsDeps | null>(null);

/**
 * Provides `ChromeComponentsDeps` to all context-aware Chrome components (`Header`,
 * `ProjectHeader`, `GridLayoutProjectSideNav`, `HeaderTopBanner`, `ChromelessHeader`,
 * `AppMenuBar`, `Sidebar`).
 *
 * The layout layer assembles these five external-service fields and wraps the layout
 * tree once. Chrome-owned state is accessed separately via `useChromeService()` hooks.
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
