import type { InternalStaticAssets } from './types';
export declare class StaticAssets implements InternalStaticAssets {
    readonly assetsHrefBase: string;
    constructor({ assetsHrefBase }: {
        assetsHrefBase: string;
    });
    getPluginAssetHref(pluginName: string, assetPath: string): string;
}
