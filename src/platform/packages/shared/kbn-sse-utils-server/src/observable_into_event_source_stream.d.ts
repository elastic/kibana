import type { Logger } from '@kbn/logging';
import type { ServerSentEvent } from '@kbn/sse-utils/src/events';
import type { Observable } from 'rxjs';
import { PassThrough } from 'stream';
import type { Zlib } from 'zlib';
declare class ResponseStream extends PassThrough {
    private _compressor?;
    setCompressor(compressor: Zlib): void;
    flush(): void;
}
export declare const cloudProxyBufferSize = 4096;
export declare function observableIntoEventSourceStream(source$: Observable<ServerSentEvent>, { logger, signal, flushThrottleMs, flushMinBytes, }: {
    logger: Pick<Logger, 'debug' | 'error'>;
    signal: AbortSignal;
    /**
     * The minimum time in milliseconds between flushes of the stream.
     * This is to avoid flushing too often if the source emits events in quick succession.
     *
     * @default 100
     */
    flushThrottleMs?: number;
    /**
     * The Cloud proxy currently buffers 4kb or 8kb of data until flushing.
     * This decreases the responsiveness of the streamed response,
     * so we manually insert some data during stream flushes to force the proxy to flush too.
     */
    flushMinBytes?: number;
}): ResponseStream;
export {};
