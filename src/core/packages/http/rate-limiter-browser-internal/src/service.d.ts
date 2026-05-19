import type { CoreService } from '@kbn/core-base-browser-internal';
import type { FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
/** @internal */
export interface SetupDeps {
    fatalErrors: FatalErrorsSetup;
    http: InternalHttpSetup;
}
/** @internal */
export type InternalRateLimiterSetup = void;
/** @internal */
export type InternalRateLimiterStart = void;
/** @internal */
export declare class HttpRateLimiterService implements CoreService<InternalRateLimiterSetup, InternalRateLimiterStart> {
    setup({ http, fatalErrors }: SetupDeps): InternalRateLimiterSetup;
    start(): InternalRateLimiterStart;
    stop(): void;
}
