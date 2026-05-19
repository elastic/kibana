import type { IBasePath } from '@kbn/core-http-browser';
export declare class BasePath implements IBasePath {
    private readonly basePath;
    readonly serverBasePath: string;
    readonly assetsHrefBase: string;
    readonly publicBaseUrl?: string;
    constructor({ basePath, serverBasePath, assetsHrefBase, publicBaseUrl, }: {
        basePath: string;
        serverBasePath?: string;
        assetsHrefBase?: string;
        publicBaseUrl?: string;
    });
    get: () => string;
    prepend: (path: string) => string;
    remove: (path: string) => string;
}
