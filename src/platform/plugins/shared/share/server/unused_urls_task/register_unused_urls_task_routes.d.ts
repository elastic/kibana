import type { Duration } from 'moment';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
export declare const registerUrlServiceRoutes: ({ router, core, urlExpirationDuration, urlLimit, logger, isEnabled, }: {
    router: IRouter;
    core: CoreSetup;
    urlExpirationDuration: Duration;
    urlLimit: number;
    logger: Logger;
    isEnabled: boolean;
}) => void;
