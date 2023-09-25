/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Observable } from 'rxjs';

import { I18nProvider } from '@kbn/i18n-react';
import type { MountPoint } from '@kbn/core/public';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { CoreTheme, ThemeServiceStart } from '@kbn/core-theme-browser';
import { defaultTheme } from '@kbn/react-kibana-context-common';

import {
  toMountPoint as _toMountPoint,
  MountPointPortal as _MountPointPortal,
  useIfMounted as _useIfMounted,
} from '@kbn/react-kibana-mount';

// The `theme` start contract should always be included to ensure
// dark mode is applied correctly.  This code is for compatibility purposes,
// and will be removed when the deprecated usages are removed.
const themeStart: ThemeServiceStart = {
  theme$: new Observable((subscriber) => subscriber.next(defaultTheme)),
};

// The `i18n` start contract should always be included to ensure
// i18n strings are correct.  This code is for compatibility purposes, and
// will be removed when the deprecated usages are removed.
const i18n: I18nStart = {
  Context: ({ children }: { children: React.ReactNode }) => <I18nProvider>{children}</I18nProvider>,
};

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
  const theme = theme$ ? { theme$ } : themeStart;
  return _toMountPoint(node, { theme, i18n });
};

/**
 * @deprecated use `MountPointPortal` from `@kbn/react-kibana-mount`
 */
export const MountPointPortal = _MountPointPortal;

/**
 * @deprecated use `useIfMounted` from `@kbn/react-kibana-mount`
 */
export const useIfMounted = _useIfMounted;
