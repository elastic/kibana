import type { KibanaRequest, Logger } from '@kbn/core/server';
export declare function logRequest(logger: Logger, req: KibanaRequest, level: 'debug' | 'warn' | 'error', message: string): void;
