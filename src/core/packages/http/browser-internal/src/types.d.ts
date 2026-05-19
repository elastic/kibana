import type { HttpSetup, HttpStart } from '@kbn/core-http-browser';
export type InternalHttpSetup = Omit<HttpSetup, 'staticAssets'> & {
    staticAssets: InternalStaticAssets;
};
export type InternalHttpStart = Omit<HttpStart, 'staticAssets'> & {
    staticAssets: InternalStaticAssets;
};
export interface InternalStaticAssets {
    getPluginAssetHref(pluginId: string, assetPath: string): string;
}
