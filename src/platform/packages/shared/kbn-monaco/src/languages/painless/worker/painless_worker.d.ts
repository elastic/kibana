import type { monaco } from '../../../monaco_imports';
import type { PainlessCompletionResult, PainlessContext, PainlessAutocompleteField } from '../types';
import type { BaseWorkerDefinition } from '../../../types';
export declare class PainlessWorker implements BaseWorkerDefinition {
    private _ctx;
    constructor(ctx: monaco.worker.IWorkerContext);
    private getTextDocument;
    getSyntaxErrors(modelUri: string): Promise<import("../../../types").MonacoEditorError[] | undefined>;
    provideAutocompleteSuggestions(currentLineChars: string, context: PainlessContext, fields?: PainlessAutocompleteField[]): PainlessCompletionResult;
}
