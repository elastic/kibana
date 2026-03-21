import type { Observable } from 'rxjs';
/**
 * A simple utility function that returns an `AbortSignal` corresponding to an `AbortController`
 * which aborts when the given request is aborted.
 * @param aborted$ The observable of abort events (usually `request.events.aborted$`)
 */
export declare function getRequestAbortedSignal(aborted$: Observable<void>): AbortSignal;
