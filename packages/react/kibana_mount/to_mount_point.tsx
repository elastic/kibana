/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
<<<<<<< HEAD:packages/react/kibana_mount/to_mount_point.tsx
import type { MountPoint } from '@kbn/core/public';
import {
  KibanaRenderContextProvider,
  KibanaRenderContextProviderProps,
} from '@kbn/react-kibana-context-render';
=======
import { Observable } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import type { MountPoint, CoreTheme } from '@kbn/core/public';
import { KibanaThemeProvider } from '../theme/kibana_theme_provider';
>>>>>>> whats-new:src/plugins/kibana_react/public/util/to_mount_point.tsx

export type ToMountPointParams = Pick<KibanaRenderContextProviderProps, 'i18n' | 'theme'>;

/**
 * MountPoint converter for react nodes.
 *
 * @param node to get a mount point for
 */
export const toMountPoint = (node: React.ReactNode, params: ToMountPointParams): MountPoint => {
  const mount = (element: HTMLElement) => {
    ReactDOM.render(
      <KibanaRenderContextProvider {...params}>{node}</KibanaRenderContextProvider>,
      element
    );
    return () => ReactDOM.unmountComponentAtNode(element);
  };

  // only used for tests and snapshots serialization
  if (process.env.NODE_ENV !== 'production') {
    mount.__reactMount__ = node;
  }

  return mount;
};
