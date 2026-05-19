import type { Observable } from 'rxjs';
/**
 * The representation of the Kibana theme, (not to be confused with the EUI theme).
 */
export interface KibanaTheme {
    /** is dark mode enabled or not */
    readonly darkMode: boolean;
    /**
     * Name of the active theme
     */
    readonly name: string;
}
/**
 * The `ThemeService` start contract, provided to plugins during the `start` lifecycle.
 */
export interface ThemeServiceStart {
    theme$: Observable<KibanaTheme>;
    getTheme?(): KibanaTheme;
}
