import { monaco } from '../monaco_imports';
import type { ParserWorker, ParseResult } from './types';
export declare class WorkerProxyService<IWorker extends ParserWorker> {
    private worker;
    getAnnos(modelUri: monaco.Uri): Promise<ParseResult | undefined>;
    setup(langId: string): void;
    stop(): void;
}
