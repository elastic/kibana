import { type Observable, type Subscription } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { PluginName } from '@kbn/core-base-common';
import type { PluginStatus } from './types';
interface LogPluginsStatusChangesParams {
    logger: Logger;
    plugins$: Observable<Record<PluginName, PluginStatus>>;
    stop$: Observable<void>;
    maxMessagesPerPluginPerInterval?: number;
    throttleIntervalMillis?: number;
    maxThrottledMessages?: number;
}
export declare const logPluginsStatusChanges: ({ logger, plugins$, stop$, maxMessagesPerPluginPerInterval, throttleIntervalMillis, maxThrottledMessages, }: LogPluginsStatusChangesParams) => Subscription;
export {};
