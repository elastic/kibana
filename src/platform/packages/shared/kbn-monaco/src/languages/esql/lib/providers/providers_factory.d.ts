import type { monaco } from '../../../../monaco_imports';
export interface CreateProviderParams<T> {
    model: monaco.editor.ITextModel;
    run: (safeModel: monaco.editor.ITextModel) => T | Promise<T>;
    emptyResult: T;
}
export declare class DisposedModelAccessError extends Error {
    constructor();
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
