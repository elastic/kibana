import type { Observable } from 'rxjs';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { LoggerContextConfigInput } from '@kbn/core-logging-server';
import type { ILoggingSystem } from './logging_system';
/** @internal */
export interface InternalLoggingServicePreboot {
    configure(contextParts: string[], config$: Observable<LoggerContextConfigInput>): void;
}
/** @internal */
export type InternalLoggingServiceSetup = InternalLoggingServicePreboot;
export interface PrebootDeps {
    loggingSystem: ILoggingSystem;
}
/** @internal */
export declare class LoggingService implements CoreService<InternalLoggingServiceSetup> {
    private readonly subscriptions;
    private readonly log;
    private internalPreboot?;
    constructor(coreContext: CoreContext);
    preboot({ loggingSystem }: PrebootDeps): InternalLoggingServicePreboot;
    setup(): {
        configure: (contextParts: string[], config$: Observable<LoggerContextConfigInput>) => void;
    };
    start(): void;
    stop(): void;
}
