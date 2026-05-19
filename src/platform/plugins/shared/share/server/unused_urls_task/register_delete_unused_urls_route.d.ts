import type { Duration } from 'moment';
import type { IRouter, Logger } from '@kbn/core/server';
import type { CoreSetup } from '@kbn/core/server';
export declare const registerDeleteUnusedUrlsRoute: ({ router, core, urlExpirationDuration, urlLimit, logger, isEnabled, }: {
    router: IRouter;
    core: CoreSetup;
    urlExpirationDuration: Duration;
    urlLimit: number;
    logger: Logger;
    isEnabled: boolean;
}) => void;
