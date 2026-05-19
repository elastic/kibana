import type { ThemeName, UiSettingsParams } from '@kbn/core-ui-settings-common';
export interface GetCoreSettingsOptions {
    isDist: boolean;
    isThemeSwitcherEnabled: boolean | undefined;
    defaultTheme?: ThemeName;
}
export declare const getCoreSettings: (options: GetCoreSettingsOptions) => Record<string, UiSettingsParams>;
export declare const getGlobalCoreSettings: () => Record<string, UiSettingsParams>;
