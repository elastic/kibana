import type { ThemeServiceStart } from '@kbn/react-kibana-context-common';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import React from 'react';
/**
 * A React HOC that wraps a component with the `KibanaThemeProvider`.
 * @param node The node to wrap.
 * @param theme The `ThemeServiceStart` API.
 */
export declare const wrapWithTheme: (node: React.ReactNode, theme: ThemeServiceStart, userProfile?: UserProfileService) => React.JSX.Element;
