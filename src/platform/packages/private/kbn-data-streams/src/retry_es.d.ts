import type { Logger } from '@kbn/logging';
export interface RetryEsOptions {
    logger?: Logger;
    dataStreamName?: string;
}
export declare function retryEs<R>(fn: () => Promise<R>, options?: RetryEsOptions): Promise<R>;
