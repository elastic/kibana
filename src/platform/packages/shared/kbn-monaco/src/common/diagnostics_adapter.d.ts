import { monaco } from '../monaco_imports';
import type { SyntaxErrors, LangValidation, BaseWorkerDefinition } from '../types';
export type WorkerAccessor = (...uris: monaco.Uri[]) => Promise<BaseWorkerDefinition>;
export declare class DiagnosticsAdapter {
    private langId;
    private worker;
    private errors;
    private validation;
    private validateIdx;
    validation$: import("rxjs").Observable<LangValidation>;
    constructor(langId: string, worker: WorkerAccessor);
    private validate;
    getSyntaxErrors(): SyntaxErrors;
}
