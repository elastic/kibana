import type { ThemeName } from '@kbn/core-ui-settings-common';
export declare const getThemeTag: ({ name, darkMode }: {
    name: string;
    darkMode: boolean;
}) => string;
/**
 * Check whether the theme is bundled in the current kibana build.
 * For a theme to be considered bundled both light and dark mode
 * styles must be included.
 */
export declare const isThemeBundled: (name: ThemeName) => boolean;
