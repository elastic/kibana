import type { PluginName, DiscoveredPlugin } from '@kbn/core-base-common';
import type { ThemeVersion } from '@kbn/ui-shared-deps-npm';
import type { EnvironmentMode, PackageInfo } from '@kbn/config';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { DarkModeValue, ThemeName } from '@kbn/core-ui-settings-common';
import type { BrowserLoggingConfig } from '@kbn/core-logging-common-internal';
/** @internal */
export interface InjectedMetadataClusterInfo {
    cluster_uuid?: string;
    cluster_name?: string;
    cluster_version?: string;
    cluster_build_flavor?: string;
}
/** @internal */
export interface InjectedMetadataPlugin {
    id: PluginName;
    plugin: DiscoveredPlugin;
    config?: {
        [key: string]: unknown;
    };
}
/** @internal */
export interface InjectedMetadataExternalUrlPolicy {
    allow: boolean;
    host?: string;
    protocol?: string;
}
/** @internal */
export interface InjectedMetadataTheme {
    darkMode: DarkModeValue;
    name: ThemeName;
    version: ThemeVersion;
    stylesheetPaths: {
        default: string[];
        dark: string[];
    };
}
/** @internal */
export interface InjectedMetadata {
    version: string;
    buildNumber: number;
    branch: string;
    basePath: string;
    serverBasePath: string;
    publicBaseUrl?: string;
    assetsHrefBase: string;
    clusterInfo: InjectedMetadataClusterInfo;
    logging: BrowserLoggingConfig;
    env: {
        mode: EnvironmentMode;
        packageInfo: PackageInfo;
        airgapped: boolean;
        isCoreRenderingInReactConcurrentMode: boolean;
    };
    featureFlags?: {
        overrides: Record<string, unknown>;
        initialFeatureFlags: Record<string, unknown>;
    };
    anonymousStatusPage: boolean;
    i18n: {
        translationsUrl: string;
        availableLocales: Array<{
            id: string;
            label: string;
        }>;
    };
    theme: InjectedMetadataTheme;
    csp: {
        warnLegacyBrowsers: boolean;
    };
    externalUrl: {
        policy: InjectedMetadataExternalUrlPolicy[];
    };
    apmConfig: Record<string, unknown> | null;
    uiPlugins: InjectedMetadataPlugin[];
    legacyMetadata: {
        uiSettings: {
            defaults: Record<string, any>;
            user: Record<string, any>;
        };
        globalUiSettings: {
            defaults: Record<string, any>;
            user: Record<string, any>;
        };
    };
    customBranding: Pick<CustomBranding, 'logo' | 'customizedLogo' | 'pageTitle'>;
}
