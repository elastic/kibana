import type { Observable } from 'rxjs';
import type { RuntimeField, RuntimeFieldSpec } from '../types';
export declare const removeFieldAttrs: (runtimeField: RuntimeField) => RuntimeFieldSpec;
/**
 * Helper function to run forkJoin
 * with restrictions on how many input observables can be subscribed to concurrently
 */
export declare function rateLimitingForkJoin<T>(observables: Array<Observable<T>>, maxConcurrentRequests: number | undefined, failValue: T): Observable<T[]>;
