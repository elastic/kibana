export { getColorMode } from './color_mode';
export { getThemeConfigByName, DEFAULT_THEME_CONFIG, type ThemeConfig } from './theme';
export type { KibanaTheme, ThemeServiceStart } from './types';
import type { KibanaTheme } from './types';
/**
 * The default `KibanaTheme` for use in Storybook, Jest, or initialization.  At
 * runtime, the theme should always be provided by the `ThemeService`.
 */
export declare const defaultTheme: KibanaTheme;
