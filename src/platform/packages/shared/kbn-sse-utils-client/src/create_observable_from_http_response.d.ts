import { Observable } from 'rxjs';
import type { ServerSentEvent } from '@kbn/sse-utils';
export interface StreamedHttpResponse {
    response?: {
        body: ReadableStream<Uint8Array> | null | undefined;
    };
}
export declare function createObservableFromHttpResponse<T extends ServerSentEvent = never>(response: StreamedHttpResponse): Observable<T>;
