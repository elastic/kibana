/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { EuiThemeProviderProps } from '@elastic/eui';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { type ThemeServiceStart } from '@kbn/react-kibana-context-common';
type EuiTheme<T = {}> = EuiThemeProviderProps<T>['theme'];
interface EuiProps<T = {}> extends Omit<EuiThemeProviderProps<T>, 'theme' | 'colorMode'> {
  euiTheme?: EuiTheme<T>;
}
/**
 * Props for the `KibanaThemeProvider`.
 */
export interface KibanaThemeProviderProps extends EuiProps {
  /** The `ThemeServiceStart` API. */
  theme: ThemeServiceStart;
  /** The `UserProfileService` start API. */
  userProfile?: Pick<UserProfileService, 'getUserProfile$'>;
}
/**
 * Unfortunately, a lot of plugins are using `KibanaThemeProvider` without a parent
 * `EuiProvider` which provides very necessary setup (e.g. Emotion cache, breakpoints).
 *
 * If a render call is using the deprecated context, we need to render an EuiProvider first
 * (but without global styles, since those are already handled by `KibanaRootContextProvider`)
 *
 * TODO: clintandrewhall - We can remove this and revert to only exporting the above component
 * once all out-of-band renders are using `KibanaRenderContextProvider`.
 */
declare const KibanaThemeProviderCheck: ({
  theme,
  userProfile,
  children,
  ...props
}: KibanaThemeProviderProps) => React.JSX.Element;
/**
 * A Kibana-specific theme provider that uses the Kibana theme service to customize the EUI theme.
 *
 * If the theme provider is missing a parent EuiProvider, one will automatically be rendered instead.
 */
export declare const KibanaThemeProvider: typeof KibanaThemeProviderCheck;
export {};
