import type { CleanupBeforeExitOptions, CleanupHandlerCallback } from './types';
export declare function wrapCleanupCallback(cb: CleanupHandlerCallback, processExitSignal: AbortSignal, options: CleanupBeforeExitOptions): () => Promise<void>;
