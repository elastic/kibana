import type { IConfigService } from '@kbn/config';
import type { BrowserLoggingConfig } from '@kbn/core-logging-common-internal';
import type { ThemeName, UiSettingsParams, UserProvidedValues } from '@kbn/core-ui-settings-common';
import type { DarkModeValue } from '@kbn/core-ui-settings-common';
export declare const getSettingValue: <T>(settingName: string, settings: {
    user?: Record<string, UserProvidedValues<unknown>>;
    defaults: Readonly<Record<string, Omit<UiSettingsParams, "schema">>>;
}, convert: (raw: unknown) => T) => T;
export declare const getBundlesHref: (baseHref: string) => string;
export declare const getScriptPaths: ({ themeName, baseHref, darkMode, }: {
    baseHref: string;
    darkMode: DarkModeValue;
    themeName: ThemeName;
}) => string[];
export declare const getCommonStylesheetPaths: ({ baseHref }: {
    baseHref: string;
}) => string[];
export declare const getThemeStylesheetPaths: ({ darkMode, baseHref, }: {
    darkMode: boolean;
    baseHref: string;
}) => string[];
export declare const getBrowserLoggingConfig: (configService: IConfigService) => Promise<BrowserLoggingConfig>;
