import type { GraphNodeUnion } from '@kbn/workflows/graph';
/**
 * Extracts the set of step IDs referenced by a node's template expressions.
 *
 * Returns:
 * - `Set<string>` of referenced step IDs when all references can be statically resolved
 * - `null` when static analysis is ambiguous (e.g. dynamic bracket access like
 *    `steps[variables.x].output`) — caller should fall back to all predecessors
 *
 * For `enter-if` nodes, KQL condition strings are also analyzed via `extractPropertyPathsFromKql`.
 *
 * Result is memoised per-node — see {@link referencedStepIdsCache}.
 */
export declare function extractReferencedStepIds(node: GraphNodeUnion): Set<string> | null;
