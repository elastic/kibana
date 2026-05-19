import { type Observable, type Subscription } from 'rxjs';
import type { Logger } from '@kbn/logging';
import { type CoreStatus } from '@kbn/core-status-common';
interface LogCoreStatusChangesParams {
    logger: Logger;
    core$: Observable<CoreStatus>;
    stop$: Observable<void>;
    maxMessagesPerServicePerInterval?: number;
    throttleIntervalMillis?: number;
    maxThrottledMessages?: number;
}
export declare const logCoreStatusChanges: ({ logger, core$, stop$, maxMessagesPerServicePerInterval, throttleIntervalMillis, maxThrottledMessages, }: LogCoreStatusChangesParams) => Subscription;
export {};
