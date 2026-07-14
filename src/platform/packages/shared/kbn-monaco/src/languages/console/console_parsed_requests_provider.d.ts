import type { ConsoleWorkerProxyService } from './console_worker_proxy';
import type { ErrorAnnotation, ParsedRequest } from './types';
import type { monaco } from '../../monaco_imports';
export declare class ConsoleParsedRequestsProvider {
    private workerProxyService;
    private model;
    constructor(workerProxyService: ConsoleWorkerProxyService, model: monaco.editor.ITextModel | null);
    getRequests(): Promise<ParsedRequest[]>;
    getErrors(): Promise<ErrorAnnotation[]>;
}
