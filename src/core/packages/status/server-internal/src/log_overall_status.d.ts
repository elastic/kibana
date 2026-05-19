import type { Observable, Subscription } from 'rxjs';
import { type ServiceStatus } from '@kbn/core-status-common';
import type { Logger } from '@kbn/logging';
interface LogOverallStatusChangesParams {
    logger: Logger;
    overall$: Observable<ServiceStatus>;
    stop$: Observable<void>;
}
export declare const logOverallStatusChanges: ({ logger, overall$, stop$, }: LogOverallStatusChangesParams) => Subscription;
export {};
