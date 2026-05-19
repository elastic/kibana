import type { OperatorFunction } from 'rxjs';
import type { ServerSentEvent } from '@kbn/sse-utils/src/events';
import type { StreamedHttpResponse } from './create_observable_from_http_response';
export declare function httpResponseIntoObservable<T extends ServerSentEvent = ServerSentEvent>(): OperatorFunction<StreamedHttpResponse, T>;
