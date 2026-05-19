/**
 * Returns execArgv entries that forward the parent's --inspect/--inspect-brk
 * flag to a worker process with an auto-incremented port.
 *
 * Returns an empty array when:
 * - `inspectWorkers` is false
 * - the parent process is not being inspected
 */
export declare function getInspectExecArgv(inspectWorkers: boolean): string[];
/**
 * Reset internal state — only for testing.
 */
export declare function resetInspectState(): void;
