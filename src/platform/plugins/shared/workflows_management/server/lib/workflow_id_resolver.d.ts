/**
 * Callback that checks which of the given candidate IDs already exist.
 * Returns the set of IDs that are taken.
 */
export type CheckExistingIds = (candidateIds: string[]) => Promise<Set<string>>;
/**
 * Validates a user-supplied workflow ID format.
 * Throws `WorkflowValidationError` if the ID is invalid.
 */
export declare const validateWorkflowId: (id: string) => void;
/**
 * Resolves unique workflow IDs for one or more base IDs.
 * Generates candidate IDs for each base (baseId, baseId-1, baseId-2, ...),
 * checks them via the provided `checkExisting` callback, and picks the first
 * available candidate per base ID while also respecting the in-batch `seenIds`
 * set to avoid collisions within the same batch.
 *
 * Chunked to stay within ES default max_result_window (10,000).
 *
 * @mutates seenIds — each resolved ID is added to the set so that callers
 *   sharing the same instance across multiple invocations get cross-batch
 *   deduplication for free.
 */
export declare const resolveUniqueWorkflowIds: (baseIds: string[], seenIds: Set<string>, checkExisting: CheckExistingIds) => Promise<string[]>;
