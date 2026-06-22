import type { Observable } from 'rxjs';
/**
 * Contains all the required information to apply Kibana's theme at the various levels it can be used.
 *
 * @public
 */
export interface CoreTheme {
    /** is dark mode enabled or not */
    readonly darkMode: boolean;
    /**
     * Name of the active theme
     */
    readonly name: string;
}
/**
 * @public
 */
export interface ThemeServiceSetup {
    /**
     * An observable of the currently active theme.
     * Note that the observable has a replay effect, so it will emit once during subscriptions.
     */
    theme$: Observable<CoreTheme>;
    /**
     * Returns the theme currently in use.
     * Note that when possible, using the `theme$` observable instead is strongly encouraged, as
     * it will allow to react to dynamic theme switch (even if those are not implemented at the moment)
     */
    getTheme(): CoreTheme;
}
/**
 * @public
 */
export type ThemeServiceStart = ThemeServiceSetup;
