import React from 'react';
import { type UseEuiTheme } from '@elastic/eui';
import type { ChromeStyle } from '../layout.types';
export declare const globalLayoutStyles: (euiThemeContext: UseEuiTheme) => import("@emotion/utils").SerializedStyles;
/**
 * Project mode background styles with gradient.
 * Only applied when chromeStyle is 'project' to differentiate from classic mode.
 */
export declare const projectModeBackgroundStyles: (euiThemeContext: UseEuiTheme) => import("@emotion/utils").SerializedStyles;
export interface GridLayoutGlobalStylesProps {
    chromeStyle?: ChromeStyle;
}
export declare const GridLayoutGlobalStyles: ({ chromeStyle, }: GridLayoutGlobalStylesProps) => React.JSX.Element;
