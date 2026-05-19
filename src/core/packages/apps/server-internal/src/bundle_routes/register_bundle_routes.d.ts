import type { PackageInfo } from '@kbn/config';
import type { IRouter } from '@kbn/core-http-server';
import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
import type { InternalStaticAssets } from '@kbn/core-http-server-internal';
/**
 *  Creates the routes that serves files from `bundlesPath`.
 *
 *  @param {Object} options
 *  @property {Array<{id,path}>} options.npUiPluginPublicDirs array of ids and paths that should be served for new platform plugins
 *  @property {string} options.regularBundlesPath
 *  @property {string} options.basePublicPath
 *
 *  @return Array.of({Hapi.Route})
 */
export declare function registerBundleRoutes({ router, uiPlugins, packageInfo, staticAssets, }: {
    router: IRouter;
    uiPlugins: UiPlugins;
    packageInfo: PackageInfo;
    staticAssets: InternalStaticAssets;
}): void;
