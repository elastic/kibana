import { type Observable } from 'rxjs';
import type { CoreService } from '@kbn/core-base-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import { type InternalMetricsServiceSetup } from '@kbn/core-metrics-server-internal';
import { type ServiceStatus } from '@kbn/core-status-common';
/** @internal */
export interface SetupDeps {
    http: InternalHttpServiceSetup;
    metrics: InternalMetricsServiceSetup;
}
/** @internal */
export interface InternalRateLimiterSetup {
    status$: Observable<ServiceStatus | undefined>;
}
/** @internal */
export type InternalRateLimiterStart = void;
/** @internal */
export declare class HttpRateLimiterService implements CoreService<InternalRateLimiterSetup, InternalRateLimiterStart> {
    private status$;
    private state$;
    private ready$;
    private stopped$;
    private handler;
    private watch;
    setup({ http, metrics }: SetupDeps): InternalRateLimiterSetup;
    start(): InternalRateLimiterStart;
    stop(): void;
}
