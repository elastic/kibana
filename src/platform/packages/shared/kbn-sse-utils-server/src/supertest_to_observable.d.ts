import type supertest from 'supertest';
import { Observable } from 'rxjs';
/**
 * Convert a supertest response to an SSE observable.
 *
 * Note: the supertest response should *NOT* be awaited when using that utility,
 * or at least not before calling it.
 *
 * @example
 * ```ts
 * const response = supertest
 *   .post(`/some/sse/endpoint`)
 *   .set('kbn-xsrf', 'kibana')
 *   .send({
 *     some: 'thing'
 *   });
 * const events = supertestIntoObservable(response);
 * ```
 */
export declare function supertestToObservable<T = any>(response: supertest.Test): Observable<T>;
