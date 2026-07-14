export declare const DEFAULT_THEME_NAME = "borealis";
export declare const SUPPORTED_THEME_NAMES: readonly ["borealis"];
export type ThemeName = (typeof SUPPORTED_THEME_NAMES)[number];
/**
 * Theme tags of the experimental Borealis theme
 */
export declare const ThemeBorealisTags: readonly ["borealislight", "borealisdark"];
/**
 * An array of all theme tags supported by Kibana. Note that this list doesn't
 * reflect what theme tags are available in a Kibana build.
 */
export declare const SUPPORTED_THEME_TAGS: readonly ["borealislight", "borealisdark"];
export type ThemeTag = (typeof SUPPORTED_THEME_TAGS)[number];
export type ThemeTags = readonly ThemeTag[];
/**
 * An array of theme tags available in Kibana by default when not customized
 * using KBN_OPTIMIZER_THEMES environment variable.
 */
export declare const DEFAULT_THEME_TAGS: ThemeTags;
export declare const FALLBACK_THEME_TAG: ThemeTag;
export declare function parseThemeTags(input?: unknown): ThemeTags;
export declare const hasNonDefaultThemeTags: (tags: ThemeTags) => boolean;
export declare const parseThemeNameValue: (value: unknown) => ThemeName;
