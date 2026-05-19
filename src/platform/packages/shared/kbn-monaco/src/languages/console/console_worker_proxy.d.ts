import { monaco } from '../../monaco_imports';
import type { ConsoleParserResult } from './types';
export declare class ConsoleWorkerProxyService {
    private worker;
    getParserResult(modelUri: monaco.Uri): Promise<ConsoleParserResult | undefined>;
    setup(): void;
    stop(): void;
}
