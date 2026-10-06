import type { BasePath } from '../base_path_service';
import type { CdnConfig } from '../cdn_config';
export interface InternalStaticAssets {
    getHrefBase(): string;
    /**
     * Returns true if a CDN has been configured and should be used to serve static assets.
     * Should only be used in scenarios where different behavior has to be used when CDN is enabled or not.
     */
    isUsingCdn(): boolean;
    /**
     * Intended for use by server code rendering UI or generating links to static assets
     * that will ultimately be called from the browser and must respect settings like
     * serverBasePath
     */
    getPluginAssetHref(pluginName: string, assetPath: string): string;
    /**
     * Intended for use by server code wanting to register static assets against Kibana
     * as server paths
     */
    getPluginServerPath(pluginName: string, assetPath: string): string;
    /**
     * Similar to getPluginServerPath, but not plugin-scoped
     */
    prependServerPath(pathname: string): string;
    /**
     * Will append the given path segment to the configured public path.
     *
     * @note This could return a path or full URL depending on whether a CDN is configured.
     */
    prependPublicUrl(pathname: string): string;
}
/** @internal */
export interface StaticAssetsParams {
    basePath: BasePath;
    cdnConfig: CdnConfig;
    shaDigest: string;
}
/**
 * Convention is for trailing slashes in pathnames are stripped.
 */
export declare class StaticAssets implements InternalStaticAssets {
    private readonly assetsHrefBase;
    private readonly assetsServerPathBase;
    private readonly hasCdnHost;
    constructor({ basePath, cdnConfig, shaDigest }: StaticAssetsParams);
    isUsingCdn(): boolean;
    /**
     * Returns a href (hypertext reference) intended to be used as the base for constructing
     * other hrefs to static assets.
     */
    getHrefBase(): string;
    getPluginAssetHref(pluginName: string, assetPath: string): string;
    prependServerPath(path: string): string;
    prependPublicUrl(pathname: string): string;
    getPluginServerPath(pluginName: string, assetPath: string): string;
}
