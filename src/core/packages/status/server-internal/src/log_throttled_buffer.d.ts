import { type Observable, type Subject } from 'rxjs';
import type { LoggableServiceStatus } from './types';
export interface CreateLogThrottledBufferOptions<LoggableStatus extends LoggableServiceStatus> {
    buffer$: Subject<LoggableStatus>;
    stop$: Observable<void>;
    bufferTimeMillis?: number;
    maxThrottledMessages: number;
}
export declare function createLogThrottledBuffer<LoggableStatus extends LoggableServiceStatus>({ buffer$, stop$, maxThrottledMessages, bufferTimeMillis, }: CreateLogThrottledBufferOptions<LoggableStatus>): Observable<LoggableStatus | string>;
