import React from 'react';
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
 * A Kibana-specific theme provider that uses the Kibana theme service to customize the EUI theme.
 *
 * If the theme provider is missing a parent EuiProvider, one will automatically be rendered instead.
 */
export declare const KibanaThemeProvider: ({ theme, userProfile, children, ...props }: KibanaThemeProviderProps) => React.JSX.Element;
export {};
