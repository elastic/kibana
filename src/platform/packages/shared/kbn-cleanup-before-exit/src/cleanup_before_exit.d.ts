/**
 * Register a cleanup callback. The callback is wrapped with lodash.once and a
 * Promise.race that respects a timeout and the abort signal from
 * `processExitController`.
 */
export declare const cleanupBeforeExit: (callback: () => void | Promise<void>, options?: import("./types").CleanupBeforeExitOptions) => () => void;
