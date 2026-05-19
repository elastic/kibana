import { monaco } from '../monaco_imports';
import type { BaseWorkerDefinition } from '../types';
export declare class WorkerProxyService<IWorker extends BaseWorkerDefinition> {
    private worker;
    getWorker(resources: monaco.Uri[]): Promise<IWorker>;
    setup(langId: string): void;
    stop(): void;
}
