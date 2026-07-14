import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { InternalLoggingServiceSetup } from '@kbn/core-logging-server-internal';
import type { TrackUserActionParams } from '@kbn/core-user-activity-server';
import type { InjectedContext, InternalUserActivityServiceSetup, InternalUserActivityServiceStart } from './types';
/** @internal */
interface UserActivitySetupDeps {
    logging: InternalLoggingServiceSetup;
}
/**
 * Service for recording user actions within Kibana.
 *
 * @internal
 */
export declare class UserActivityService implements CoreService<InternalUserActivityServiceSetup, InternalUserActivityServiceStart> {
    private readonly coreContext;
    private readonly logger;
    private enabled;
    private filters;
    private readonly injectedContextAsyncStorage;
    constructor(coreContext: CoreContext);
    setup({ logging }: UserActivitySetupDeps): InternalUserActivityServiceSetup;
    start(): {
        trackUserAction: ({ message, event, object, metadata, error, }: TrackUserActionParams) => void;
        setInjectedContext: (newContext: InjectedContext) => void;
    };
    stop(): void;
    private trackUserAction;
    private setInjectedContext;
    private getInjectedContext;
}
export {};
