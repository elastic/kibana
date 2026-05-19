import type { CoreService } from '@kbn/core-base-browser-internal';
import type { IAnonymousPaths, IBasePath } from '@kbn/core-http-browser';
interface Deps {
    basePath: IBasePath;
}
export declare class AnonymousPathsService implements CoreService<IAnonymousPaths, IAnonymousPaths> {
    private readonly paths;
    setup({ basePath }: Deps): {
        isAnonymous: (path: string) => boolean;
        register: (path: string) => void;
        normalizePath: (path: string) => string;
    };
    start(deps: Deps): {
        isAnonymous: (path: string) => boolean;
        register: (path: string) => void;
        normalizePath: (path: string) => string;
    };
    stop(): void;
}
export {};
