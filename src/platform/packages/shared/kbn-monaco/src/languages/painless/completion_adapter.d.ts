import { monaco } from '../../monaco_imports';
import type { EditorStateService } from './lib';
import type { PainlessWorker } from './worker';
export declare class PainlessCompletionAdapter implements monaco.languages.CompletionItemProvider {
    private worker;
    private editorStateService;
    constructor(worker: {
        (...uris: monaco.Uri[]): Promise<PainlessWorker>;
        (arg0: monaco.Uri): Promise<PainlessWorker>;
    }, editorStateService: EditorStateService);
    get triggerCharacters(): string[];
    provideCompletionItems(model: monaco.editor.IReadOnlyModel, position: monaco.Position): Promise<monaco.languages.CompletionList>;
}
