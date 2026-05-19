import { type UiSettingsParams, type ThemeName } from '@kbn/core-ui-settings-common';
export interface GetThemeSettingsOptions {
    isDist: boolean;
    isThemeSwitcherEnabled: boolean | undefined;
    defaultTheme?: ThemeName;
}
export declare const getThemeSettings: (options: GetThemeSettingsOptions) => Record<string, UiSettingsParams>;
