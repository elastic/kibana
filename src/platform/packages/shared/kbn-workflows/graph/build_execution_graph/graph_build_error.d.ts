/**
 * Error thrown while compiling a workflow definition into its execution graph
 * (e.g. an unsupported construct inside a parallel branch). Carries the
 * offending `stepId` so callers — notably the editor's validation layer — can
 * anchor the message to the specific step in the YAML instead of failing with
 * a generic "document not loaded" error.
 */
export declare class GraphBuildError extends Error {
    /** Step id (workflow `name`) the error relates to, when known. */
    readonly stepId?: string;
    constructor(message: string, stepId?: string);
}
/** Type guard for {@link GraphBuildError}. */
export declare function isGraphBuildError(error: unknown): error is GraphBuildError;
