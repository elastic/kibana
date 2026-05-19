import type { InjectedMetadata, InjectedMetadataClusterInfo, InjectedMetadataExternalUrlPolicy, InjectedMetadataPlugin, InjectedMetadataTheme } from '@kbn/core-injected-metadata-common-internal';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
/** @internal */
export interface InjectedMetadataParams {
    injectedMetadata: InjectedMetadata;
}
/**
 * Provides access to the metadata injected by the server into the page
 *
 * @internal
 */
export interface InternalInjectedMetadataSetup {
    getBasePath: () => string;
    getServerBasePath: () => string;
    getPublicBaseUrl: () => string | undefined;
    getAssetsHrefBase: () => string;
    getKibanaBuildNumber: () => number;
    getKibanaBranch: () => string;
    getKibanaVersion: () => string;
    getCspConfig: () => {
        warnLegacyBrowsers: boolean;
    };
    getExternalUrlConfig: () => {
        policy: InjectedMetadataExternalUrlPolicy[];
    };
    getTheme: () => InjectedMetadataTheme;
    getElasticsearchInfo: () => InjectedMetadataClusterInfo;
    /**
     * An array of frontend plugins in topological order.
     */
    getPlugins: () => InjectedMetadataPlugin[];
    getAnonymousStatusPage: () => boolean;
    getLegacyMetadata: () => {
        uiSettings: {
            defaults: Record<string, any>;
            user?: Record<string, any> | undefined;
        };
        globalUiSettings: {
            defaults: Record<string, any>;
            user?: Record<string, any> | undefined;
        };
    };
    getCustomBranding: () => CustomBranding;
    getFeatureFlags: () => {
        overrides: Record<string, unknown>;
        initialFeatureFlags: Record<string, unknown>;
    } | undefined;
}
/** @internal */
export type InternalInjectedMetadataStart = InternalInjectedMetadataSetup;
