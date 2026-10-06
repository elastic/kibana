import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
export interface PluginInfo {
    publicPath: string;
    bundlePath: string;
}
export declare const getPluginsBundlePaths: ({ uiPlugins, bundlesHref, isAnonymousPage, }: {
    uiPlugins: UiPlugins;
    bundlesHref: string;
    isAnonymousPage: boolean;
}) => Map<string, PluginInfo>;
