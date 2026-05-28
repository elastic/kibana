import React from 'react';
import type { KibanaThemeProviderProps as KbnThemeProviderProps } from '@kbn/react-kibana-context-theme';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
/** @deprecated Use `KibanaThemeProviderProps` from `@kbn/react-kibana-context-theme`  */
export type KibanaThemeProviderProps = Pick<KbnThemeProviderProps, 'children' | 'modify' | 'userProfile'> & KbnThemeProviderProps['theme'];
/** @deprecated Use `KibanaThemeProvider` from `@kbn/react-kibana-context-theme`  */
export declare const KibanaThemeProvider: ({ children, theme$, userProfile, modify, }: KibanaThemeProviderProps) => React.JSX.Element;
type Theme = KbnThemeProviderProps['theme']['theme$'];
/** @deprecated Use `wrapWithTheme` from `@kbn/react-kibana-context-theme`  */
export declare const wrapWithTheme: (node: React.ReactNode, theme$: Theme, userProfile?: UserProfileService) => React.JSX.Element;
export {};
