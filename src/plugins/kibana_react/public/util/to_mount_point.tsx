/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Observable } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import type { MountPoint, CoreTheme } from '@kbn/core/public';
import { KibanaThemeProvider } from '../theme';

export interface ToMountPointOptions {
  theme$?: Observable<CoreTheme>;
}

/**
 * MountPoint converter for react nodes.
 *
 * @param node to get a mount point for
 */
export const toMountPoint = (
  node: React.ReactNode,
  { theme$ }: ToMountPointOptions = {}
): MountPoint => {
  const content = theme$ ? <KibanaThemeProvider theme$={theme$}>{node}</KibanaThemeProvider> : node;
  const mount = (element: HTMLElement) => {
    ReactDOM.render(<I18nProvider>{content}</I18nProvider>, element);
    return () => ReactDOM.unmountComponentAtNode(element);
  };
  // only used for tests and snapshots serialization
  if (process.env.NODE_ENV !== 'production') {
    mount.__reactMount__ = node;
  }
  return mount;
};
