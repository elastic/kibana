import type { CleanupBeforeExitOptions } from './types';
type CleanupCallback = () => void | Promise<void>;
export declare function createCleanupBeforeExit(proc: NodeJS.Process): (callback: CleanupCallback, options?: CleanupBeforeExitOptions) => () => void;
export {};
