import type { ThemeServiceStart } from '@kbn/core-theme-browser';
/** @internal */
export interface InternalThemeServiceStart extends ThemeServiceStart {
    /**
     * Dev-only: switch the color theme (dark/light) live, without a page reload.
     *
     * Applies the theme immediately (stylesheets, EUI providers subscribed to
     * `theme$`) and is session-only — a reload restores the server-resolved theme.
     * Not exposed on the public contract; intended for the developer toolbar.
     */
    setDarkMode(darkMode: boolean): void;
}
