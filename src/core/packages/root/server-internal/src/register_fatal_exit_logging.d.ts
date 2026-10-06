import type { Logger } from '@kbn/logging';
/** @internal */
export interface FatalExitLogging {
    /**
     * Flags that the reason for terminating has already been reported, so that the
     * `exit` guard stays silent for shutdowns going through `Root.shutdown()`.
     */
    markShutdownReasonReported: () => void;
    unregister: () => void;
}
interface RegisterFatalExitLoggingDeps {
    logger: Logger;
}
/**
 * Logs terminations that don't go through `Root.shutdown()`, such as an exception thrown from a
 * timer or event callback, or a `process.exit()` called from outside the root shutdown path.
 *
 * Terminations that give us no chance to run any code (`SIGKILL`, the OOM killer,
 * `process.abort()`) cannot be reported here.
 *
 * @internal
 */
export declare const registerFatalExitLogging: ({ logger, }: RegisterFatalExitLoggingDeps) => FatalExitLogging;
export {};
