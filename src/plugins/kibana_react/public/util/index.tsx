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
import type { MountPoint, CoreTheme } from '@kbn/core/public';

import {
  toMountPoint as _toMountPoint,
  MountPointPortal as _MountPointPortal,
  useIfMounted as _useIfMounted,
} from '@kbn/react-kibana-mount';
import { I18nProvider } from '@kbn/i18n-react';

/**
 * @deprecated use `ToMountPointParams` from `@kbn/react-kibana-mount`
 */
export interface ToMountPointOptions {
  theme$?: Observable<CoreTheme>;
}

/**
 * @deprecated use `toMountPoint` from `@kbn/react-kibana-mount`
 */
export const toMountPoint = (
  node: React.ReactNode,
  { theme$ }: ToMountPointOptions = {}
): MountPoint => {
  if (theme$) {
    return _toMountPoint(node, { theme$ });
  }

  // A `theme` should always be included in order to ensure dark mode
  // is applied correctly.  This code is for compatibility purposes, and
  // will be removed when the deprecated usages are removed.
  const mount = (element: HTMLElement) => {
    ReactDOM.render(<I18nProvider>{node}</I18nProvider>, element);
    return () => ReactDOM.unmountComponentAtNode(element);
  };

  if (process.env.NODE_ENV !== 'production') {
    mount.__reactMount__ = node;
  }
  return mount;
};

/**
 * @deprecated use `MountPointPortal` from `@kbn/react-kibana-mount`
 */
export const MountPointPortal = _MountPointPortal;

/**
 * @deprecated use `useIfMounted` from `@kbn/react-kibana-mount`
 */
export const useIfMounted = _useIfMounted;
