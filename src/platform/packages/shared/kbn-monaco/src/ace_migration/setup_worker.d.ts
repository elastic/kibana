import type { ParserWorker } from './types';
import type { WorkerProxyService } from './worker_proxy';
export declare const setupWorker: (langId: string, owner: string, worker: WorkerProxyService<ParserWorker>) => void;
