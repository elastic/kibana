import type { Observable } from 'rxjs';
import type { CoreSetup, CoreTheme } from '@kbn/core/public';
import type { PartialTheme, Theme } from '@elastic/charts';
export declare class ThemeService {
    /** Returns default charts theme */
    readonly chartsDefaultBaseTheme: Theme;
    private theme$?;
    private _chartsBaseTheme$;
    /** An observable of the current charts base theme */
    chartsBaseTheme$: Observable<Theme>;
    /**
     * An observable boolean for dark mode of kibana
     *
     * @deprecated use `useKibanaIsDarkMode`
     */
    get darkModeEnabled$(): Observable<CoreTheme>;
    /**
     * A React hook for consuming the dark mode value
     *
     * @deprecated use `useKibanaIsDarkMode`
     */
    useDarkMode: () => boolean;
    /**
     * @deprecated No longer need to use theme on top of baseTheme, see https://github.com/elastic/kibana/pull/170914#issuecomment-1823014121
     */
    useChartsTheme: () => PartialTheme;
    /**
     * A react hook to return shared sparkline chart overrides
     *
     * Replacement for `EUI_SPARKLINE_THEME_PARTIAL`
     */
    useSparklineOverrides: () => PartialTheme;
    /** A React hook for consuming the charts theme */
    useChartsBaseTheme: () => Theme;
    /**
     * Initialize theme service with dark mode
     *
     * Meant to be called by charts plugin setup method
     */
    init(theme: CoreSetup['theme']): void;
}
