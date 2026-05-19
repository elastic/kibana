import type { UseEuiTheme } from '@elastic/eui';
/**
 * Helper function to get container border styles for high contrast mode.
 * In high contrast mode, renders a solid border. Otherwise, renders based on color mode.
 *
 * @param euiThemeContext - EUI theme context
 * @param highContrastMode - High contrast mode setting
 * @returns CSS border string
 */
export declare const getHighContrastBorder: (euiThemeContext: UseEuiTheme) => string;
export interface HighContrastSeparatorOptions {
    /** The side to place the border separator ('top' or 'bottom'). Default: 'bottom' */
    side?: 'top' | 'bottom';
    /** Width of the separator line. Default: theme.size.xl */
    width?: string;
    /** Left position for the separator. Default: '0' */
    left?: string;
    /** Right position for the separator. Default: '0' */
    right?: string;
}
/**
 * Helper function to get separator border styles for high contrast mode.
 * In high contrast mode, renders a real border. Otherwise, renders a pseudo-element with subdued styling.
 *
 * @param euiTheme - EUI theme object
 * @param highContrastMode - High contrast mode setting
 * @param options - Configuration options for the separator
 * @returns CSS string for the separator
 */
export declare const getHighContrastSeparator: (euiThemeContext: UseEuiTheme, options?: HighContrastSeparatorOptions) => string;
