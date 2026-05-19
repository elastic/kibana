import type { EuiThemeSystem } from '@elastic/eui';
export interface ThemeConfig {
    euiTheme: EuiThemeSystem;
}
export declare const getThemeConfigByName: (name: string) => ThemeConfig | null;
export declare const DEFAULT_THEME_CONFIG: ThemeConfig;
