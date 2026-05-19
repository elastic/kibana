import type { UseEuiTheme } from '@elastic/eui';
export { type HighContrastSeparatorOptions, getHighContrastBorder, getHighContrastSeparator, } from '@kbn/core-chrome-layout-utils';
export declare const highContrastHoverStyle: ({ euiTheme }: UseEuiTheme) => string;
/**
 * Hook to get the high contrast mode hover styles for buttons.
 *
 * @param selector - the selector to apply the high contrast mode hover styles to.
 * @returns the high contrast mode hover styles.
 */
export declare const useHighContrastModeStyles: (selector?: string) => import("@emotion/react").SerializedStyles | undefined;
