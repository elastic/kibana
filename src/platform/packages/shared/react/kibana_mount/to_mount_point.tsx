/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { RenderContextService } from '@kbn/core-render-context-browser';
import {
  KibanaRenderContextProvider,
  KibanaRenderContextProviderProps,
} from '@kbn/react-kibana-context-render';

/**
 * @deprecated Pass RenderContextService as the second parameter to toMountPoint instead
 */
type ToMountPointParamsDeprecated = Pick<
  KibanaRenderContextProviderProps,
  'analytics' | 'i18n' | 'theme' | 'userProfile'
>;

export type ToMountPointParams = ToMountPointParamsDeprecated | RenderContextService;

function isParamsUsingPreferred(params?: ToMountPointParams): params is RenderContextService {
  return (
    typeof params !== 'undefined' &&
    typeof (params as RenderContextService).addContext !== 'undefined'
  );
}

/**
 * MountPoint converter for react nodes.
 *
 * @param node React node to get a mount point for
 * @param params services needed for rendering fully-featured React nodes in Kibana
 */
export const toMountPoint = (node: React.ReactNode, params: ToMountPointParams): MountPoint => {
  let mount: ((element: HTMLElement) => () => boolean) & {
    __reactMount__?: React.ReactNode;
  };

  if (isParamsUsingPreferred(params)) {
    mount = (element: HTMLElement) => {
      ReactDOM.render(params.addContext(node), element);
      return () => ReactDOM.unmountComponentAtNode(element);
    };
  } else {
    mount = (element: HTMLElement) => {
      ReactDOM.render(
        <KibanaRenderContextProvider {...params}>{node}</KibanaRenderContextProvider>,
        element
      );
      return () => ReactDOM.unmountComponentAtNode(element);
    };
  }

  // only used for tests and snapshots serialization
  if (process.env.NODE_ENV !== 'production') {
    mount.__reactMount__ = node;
  }

  return mount;
};
