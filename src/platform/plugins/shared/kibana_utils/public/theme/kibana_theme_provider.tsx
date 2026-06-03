/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { Observable } from 'rxjs';

import type { EuiProviderProps } from '@elastic/eui';
import type { CoreTheme } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { KibanaThemeProvider as KbnThemeProvider } from '@kbn/react-kibana-context-theme';

export interface KibanaThemeProviderProps {
  theme$: Observable<CoreTheme>;
  userProfile?: UserProfileService;
  modify?: EuiProviderProps<{}>['modify'];
  children: React.ReactNode;
}

/** @deprecated use `KibanaThemeProvider` from `@kbn/react-kibana-context-theme */
export const KibanaThemeProvider: FC<PropsWithChildren<KibanaThemeProviderProps>> = ({
  theme$,
  userProfile,
  modify,
  children,
}) => (
  <KbnThemeProvider {...{ theme: { theme$ }, modify }} userProfile={userProfile}>
    {children}
  </KbnThemeProvider>
);
