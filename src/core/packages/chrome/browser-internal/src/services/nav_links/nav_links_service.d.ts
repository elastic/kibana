import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { ChromeNavLinks } from '@kbn/core-chrome-browser';
interface StartDeps {
    application: InternalApplicationStart;
    http: InternalHttpStart;
}
export declare class NavLinksService {
    private readonly stop$;
    start({ application, http }: StartDeps): ChromeNavLinks;
    stop(): void;
}
export {};
