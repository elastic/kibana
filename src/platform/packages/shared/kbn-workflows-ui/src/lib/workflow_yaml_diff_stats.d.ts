import { type Change } from 'diff';
export interface WorkflowYamlDiffStats {
    parts: Change[];
    added: number;
    removed: number;
    hunkCount: number;
}
/**
 * Compute line-based diff statistics for a pair of workflow YAML strings.
 *
 * Callers that render inside React should memoize this via `useMemo` keyed on
 * the input strings — the function itself is pure and does not cache.
 */
export declare const computeWorkflowYamlDiffStats: (beforeYaml: string, afterYaml: string) => WorkflowYamlDiffStats;
