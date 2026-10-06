import type { MigrationLog } from '../types';
export interface RetryableState {
    controlState: string;
    retryCount: number;
    skipRetryReset: boolean;
    retryDelay: number;
    logs: MigrationLog[];
}
export declare const delayRetryState: <S extends RetryableState>(state: S, errorMessage: string, 
/** How many times to retry a step that fails */
maxRetryAttempts: number) => S;
export declare const resetRetryState: <S extends RetryableState>(state: S) => S;
