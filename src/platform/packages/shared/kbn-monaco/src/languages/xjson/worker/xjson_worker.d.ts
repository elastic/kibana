import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import type { ParseResult } from '../../../ace_migration/types';
export declare class XJsonWorker {
    private ctx;
    constructor(ctx: monaco.worker.IWorkerContext);
    private parser;
    parse(modelUri: string): Promise<ParseResult | undefined>;
}
