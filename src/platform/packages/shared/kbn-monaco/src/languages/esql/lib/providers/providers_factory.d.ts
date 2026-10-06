import type { ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '../../../../monaco_imports';
export interface CreateProviderParams<T> {
    model: monaco.editor.ITextModel;
    run: (safeModel: monaco.editor.ITextModel) => T | Promise<T>;
    emptyResult: T;
}
/**
 * Throwing ProviderEmptyResultError will cause the provider to stop execution and return the emptyResult.
 */
export type ProviderEmptyResultErrorCode = 'DisposedModelAccessError' | 'AbortedDueToCancellationError';
export declare class ProviderEmptyResultError extends Error {
    readonly code: ProviderEmptyResultErrorCode;
    constructor(code: ProviderEmptyResultErrorCode);
}
/**
 * Creates a generic Provider for Monaco.
 * It executes the "run" function provided with a Proxied instance of the Monaco model.
 * If the providers tries to access the model after it has been disposed,
 * it will return the "emptyResult" instead of throwing an error.
 *
 * - Use safeModel for accessing any property or function of the model.
 * - Use the original model if you need to compare instances.
 */
export declare function createMonacoProvider<T>({ model, run, emptyResult, }: CreateProviderParams<T>): Promise<T>;
/**
 * Wraps a Monaco text model so that any property access or method call after disposal throws a controlled error.
 */
export declare function createDisposedSafeModel(model: monaco.editor.ITextModel): monaco.editor.ITextModel;
/**
 * Wraps every callback in a function that throws an error if the cancellation token is triggered by Monaco.
 * The token is checked before and after the callback is executed.
 * The exception is caught by the providers factory to return an empty result and cut the execution of the provider,
 * saving other api calls and further processing time.
 *
 * Note: we can't abort the in-flight promise as they are memoized and awaited by different callers at the same time.
 * @param callbacks
 * @param token
 * @returns
 */
export declare function createCancellableCallbacks<TCallbacks extends ESQLCallbacks | undefined>(callbacks: TCallbacks, token?: monaco.CancellationToken): TCallbacks;
